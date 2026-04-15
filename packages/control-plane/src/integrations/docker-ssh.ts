import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

/**
 * Direct Docker deployment via SSH — bypasses HFSP HTTP API entirely.
 * Used as primary deploy path for Tier A (shared Docker on our VPS),
 * and as fallback when HFSP service is unreachable.
 *
 * Requires SSH key access to VPS_HOST.
 */

const VPS_HOST = process.env.VPS_HOST || '187.124.170.113';
const VPS_USER = process.env.VPS_USER || 'root';
const SSH_KEY = process.env.SSH_KEY_PATH || `${process.env.HOME}/.ssh/id_rsa`;
const OPENCLAW_IMAGE = process.env.OPENCLAW_IMAGE || 'ghcr.io/clawdrop/openclaw:latest';

const ssh = (cmd: string) =>
  execAsync(
    `ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${VPS_USER}@${VPS_HOST} "${cmd.replace(/"/g, '\\"')}"`,
    { timeout: 60_000 }
  );

export interface DockerDeployResult {
  container_id: string;
  agent_id: string;
  status: 'running' | 'error';
  vps_ip: string;
  error?: string;
}

export interface DockerStatusResult {
  agent_id: string;
  container_id?: string;
  status: 'running' | 'stopped' | 'not_found' | 'error';
  uptime_seconds?: number;
  error?: string;
}

/**
 * Deploy an OpenClaw agent container directly via SSH + Docker.
 * No HFSP dependency — runs `docker run` on the VPS directly.
 */
export async function deployViaDocker(params: {
  agent_id: string;
  owner_wallet: string;
  bundles: string[];
  tier_id: string;
}): Promise<DockerDeployResult> {
  const { agent_id, owner_wallet, bundles, tier_id } = params;
  const containerName = `openclaw_${agent_id}`;
  const bundleStr = bundles.join(',');

  try {
    logger.info({ agent_id, tier_id, bundles }, 'Deploying via direct Docker SSH');

    // Pull latest image first (non-blocking in background on VPS)
    await ssh(`docker pull ${OPENCLAW_IMAGE} > /dev/null 2>&1 || true`);

    // Launch the container
    const runCmd = [
      'docker run -d',
      `--name ${containerName}`,
      `--restart unless-stopped`,
      `-e AGENT_ID=${agent_id}`,
      `-e OWNER_WALLET=${owner_wallet}`,
      `-e INSTALLED_BUNDLES=${bundleStr}`,
      `-e TIER_ID=${tier_id}`,
      `-e ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY || ''}`,
      `-l clawdrop.agent_id=${agent_id}`,
      `-l clawdrop.owner_wallet=${owner_wallet}`,
      OPENCLAW_IMAGE,
    ].join(' ');

    const { stdout } = await ssh(runCmd);
    const container_id = stdout.trim().slice(0, 12);

    logger.info({ agent_id, container_id, vps_ip: VPS_HOST }, 'Docker container launched');

    return { container_id, agent_id, status: 'running', vps_ip: VPS_HOST };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ agent_id, error: msg }, 'Docker SSH deployment failed');
    return { container_id: '', agent_id, status: 'error', vps_ip: VPS_HOST, error: msg };
  }
}

/**
 * Get container status for an agent via SSH.
 */
export async function getDockerStatus(agent_id: string): Promise<DockerStatusResult> {
  const containerName = `openclaw_${agent_id}`;
  try {
    const { stdout } = await ssh(
      `docker inspect --format '{{.State.Status}} {{.State.StartedAt}}' ${containerName} 2>/dev/null || echo not_found`
    );
    const [state, startedAt] = stdout.trim().split(' ');

    if (state === 'not_found' || !state) {
      return { agent_id, status: 'not_found' };
    }

    const uptimeSeconds = startedAt
      ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
      : 0;

    return {
      agent_id,
      status: state === 'running' ? 'running' : 'stopped',
      uptime_seconds: uptimeSeconds,
    };
  } catch (err) {
    return { agent_id, status: 'error', error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Stop and remove a container via SSH.
 */
export async function removeDockerContainer(agent_id: string): Promise<boolean> {
  const containerName = `openclaw_${agent_id}`;
  try {
    await ssh(`docker rm -f ${containerName} 2>/dev/null || true`);
    logger.info({ agent_id }, 'Container removed via Docker SSH');
    return true;
  } catch (err) {
    logger.error({ agent_id, error: err }, 'Failed to remove container');
    return false;
  }
}

/**
 * SSH connectivity check — used to verify VPS is reachable before deploying.
 */
export async function checkSSHConnectivity(): Promise<boolean> {
  try {
    await ssh('echo ok');
    return true;
  } catch {
    return false;
  }
}

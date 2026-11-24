import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AGENT_BY_ID,
  AGENTS,
  AVOIDED_HOST_PORTS,
  COLLABORATION_PAIRS,
  DIVISIONS,
  ECOSYSTEM_SERVICES,
  hexToThreeColor,
  resolveEcosystemServiceUrls,
  resolveGatewayEndpoints,
} from '../src/data/contracts.ts';
import {
  AGENT_DOSSIER_DATA,
  DIVISION_TARGETS,
  TOUR_DELAY_MS,
  filterAgents,
  formatActivityTickerMessage,
} from '../src/data/dossierData.ts';
import { AGENT_DESK_ASSIGNMENTS, ZONE_BY_ID, ZONES } from '../src/data/buildingLayout.ts';
import type { AgentActivityState } from '../src/types/office.ts';

describe('Canonical Contracts & Legacy Dossier Data', () => {
  it('defines all 6 divisions partitioning agents 0..23 without gaps or overlaps', () => {
    expect(DIVISIONS).toHaveLength(6);
    const seenIds = new Set<number>();
    for (const div of DIVISIONS) {
      expect(hexToThreeColor(div.color)).toBe(div.threeColor);
      for (const id of div.agentIds) {
        expect(seenIds.has(id)).toBe(false);
        seenIds.add(id);
        const agent = AGENT_BY_ID.get(id);
        expect(agent).toBeDefined();
        expect(agent?.divisionId).toBe(div.id);
        expect(agent?.defaultFloor).toBe(div.defaultFloor);
        expect(agent?.defaultZone).toBe(div.defaultZone);
      }
    }
    expect(seenIds.size).toBe(24);
  });

  it('defines all 24 agents with contiguous IDs 0..23', () => {
    expect(AGENTS).toHaveLength(24);
    AGENTS.forEach((agent, index) => {
      expect(agent.id).toBe(index);
      expect(agent.name.length).toBeGreaterThan(2);
      expect(agent.shortName.length).toBeGreaterThan(2);
      expect(agent.skills.primary.length).toBeGreaterThan(0);
      expect(agent.skills.stack.length).toBeGreaterThan(0);
      expect(agent.methodology.length).toBeGreaterThan(0);
      expect(agent.certifications.length).toBeGreaterThan(0);
    });
  });

  it('uses canonical fixed COLLABORATION_PAIRS IDs matching dialogue personas', () => {
    expect(COLLABORATION_PAIRS).toHaveLength(6);
    expect(
      COLLABORATION_PAIRS.map((p) => [p.initiator, p.target]),
    ).toEqual([
      [5, 18],
      [6, 20],
      [19, 4],
      [8, 0],
      [23, 1],
      [9, 3],
    ]);

    for (const pair of COLLABORATION_PAIRS) {
      expect(AGENT_BY_ID.get(pair.initiator)).toBeDefined();
      expect(AGENT_BY_ID.get(pair.target)).toBeDefined();
    }
  });

  it('cross-checks parity against lokatalenta-event-gateway/contracts/*.json when present', () => {
    const contractsDir = path.resolve(
      process.cwd(),
      '../lokatalenta-event-gateway/contracts',
    );
    if (!fs.existsSync(contractsDir)) return;

    const divisionsJson = JSON.parse(
      fs.readFileSync(path.join(contractsDir, 'divisions.json'), 'utf8'),
    ) as { divisions: Array<Record<string, unknown>> };
    const agentsJson = JSON.parse(
      fs.readFileSync(path.join(contractsDir, 'agents.json'), 'utf8'),
    ) as {
      agents: Array<Record<string, unknown>>;
      collaborationPairs: Array<Record<string, unknown>>;
    };
    const portsJson = JSON.parse(
      fs.readFileSync(path.join(contractsDir, 'ecosystem-ports.json'), 'utf8'),
    ) as {
      avoidedHostPorts: number[];
      services: Array<Record<string, unknown>>;
    };

    expect(divisionsJson.divisions).toHaveLength(DIVISIONS.length);
    divisionsJson.divisions.forEach((rawDiv, i) => {
      const div = DIVISIONS[i];
      expect(rawDiv.id).toBe(div.id);
      expect(rawDiv.name).toBe(div.name);
      expect(rawDiv.shortName).toBe(div.shortName);
      expect(rawDiv.motto).toBe(div.motto);
      expect(rawDiv.color).toBe(div.color);
      expect(hexToThreeColor(String(rawDiv.threeColor))).toBe(div.threeColor);
      expect(rawDiv.defaultFloor).toBe(div.defaultFloor);
      expect(rawDiv.defaultZone).toBe(div.defaultZone);
      expect(rawDiv.agentIds).toEqual(div.agentIds);
    });

    expect(agentsJson.agents).toHaveLength(AGENTS.length);
    agentsJson.agents.forEach((rawAgent, i) => {
      const agent = AGENTS[i];
      expect(rawAgent.id).toBe(agent.id);
      expect(rawAgent.name).toBe(agent.name);
      expect(rawAgent.shortName).toBe(agent.shortName);
      expect(rawAgent.role).toBe(agent.role);
      expect(rawAgent.divisionId).toBe(agent.divisionId);
      expect(rawAgent.category).toBe(agent.category);
      expect(rawAgent.avatar).toBe(agent.avatar);
      expect(rawAgent.skills).toEqual(agent.skills);
      expect(rawAgent.methodology).toEqual(agent.methodology);
      expect(rawAgent.certifications).toEqual(agent.certifications);
      expect(rawAgent.avatarStyle).toEqual(agent.avatarStyle);
      expect(rawAgent.defaultZone).toBe(agent.defaultZone);
      expect(rawAgent.defaultFloor).toBe(agent.defaultFloor);
    });

    expect(agentsJson.collaborationPairs).toEqual(COLLABORATION_PAIRS);
    expect(portsJson.avoidedHostPorts).toEqual(AVOIDED_HOST_PORTS);
    expect(portsJson.services).toEqual(ECOSYSTEM_SERVICES);
  });

  it('extracts complete legacy dossier data for all 24 agents and 6 divisions', () => {
    expect(TOUR_DELAY_MS).toBe(60000);
    for (const agent of AGENTS) {
      const dossier = AGENT_DOSSIER_DATA[agent.id];
      expect(dossier).toBeDefined();
      expect(dossier.workload).toBeGreaterThanOrEqual(80);
      expect(dossier.status.label.length).toBeGreaterThan(3);
      expect(dossier.status.ticket.length).toBeGreaterThan(2);
      expect(dossier.status.ac.length).toBeGreaterThanOrEqual(3);
      expect(dossier.status.codeSnippet.length).toBeGreaterThan(20);
      expect(dossier.screen.file.length).toBeGreaterThan(3);
      expect(dossier.screen.lines.length).toBeGreaterThanOrEqual(4);
    }

    for (const div of DIVISIONS) {
      expect(DIVISION_TARGETS[div.id]).toHaveLength(4);
    }

    const pwaMatches = filterAgents('PWA-01');
    expect(pwaMatches.length).toBeGreaterThanOrEqual(3);
    expect(pwaMatches.some((a) => a.id === 5)).toBe(true);

    const states: AgentActivityState[] = [
      'working',
      'walking',
      'meeting',
      'dining',
      'praying',
      'gym_workout',
      'lounging',
      'riding_elevator',
    ];
    for (const st of states) {
      const msg = formatActivityTickerMessage(AGENTS[0], st, 'executive', AGENTS[1]);
      expect(msg).toContain(AGENTS[0].shortName);
    }
  });

  it('maps all 12 zones and 24 agent desks inside valid zone bounds', () => {
    expect(ZONES).toHaveLength(12);
    expect(AGENT_DESK_ASSIGNMENTS).toHaveLength(24);
    for (const desk of AGENT_DESK_ASSIGNMENTS) {
      const zone = ZONE_BY_ID[desk.zone];
      expect(zone).toBeDefined();
      expect(desk.floor).toBe(zone.floor);
      expect(desk.deskPos.x).toBeGreaterThanOrEqual(zone.minX);
      expect(desk.deskPos.x).toBeLessThanOrEqual(zone.maxX);
      expect(desk.deskPos.z).toBeGreaterThanOrEqual(zone.minZ);
      expect(desk.deskPos.z).toBeLessThanOrEqual(zone.maxZ);
    }
  });

  it('resolves ecosystem service URLs and gateway endpoints via Vite env vars and ?gateway= override', () => {
    const defaults = resolveEcosystemServiceUrls({}, '');
    expect(defaults).toEqual({
      lmsPsikotes: 'http://localhost:4100',
      eventGateway: 'http://localhost:4101',
      backlog: 'http://localhost:4112',
      sprintPlanner: 'http://localhost:4113',
      docs: 'http://localhost:4114',
      office3d: 'http://localhost:4105',
    });

    const fromEnv = resolveEcosystemServiceUrls(
      {
        VITE_LMS_URL: 'https://lms.lokatalenta.id/',
        VITE_EVENT_GATEWAY_URL: 'https://gw.lokatalenta.id/',
        VITE_BACKLOG_URL: 'https://backlog.lokatalenta.id',
        VITE_SPRINT_URL: 'https://sprint.lokatalenta.id',
        VITE_DOCS_URL: 'https://docs.lokatalenta.id',
        VITE_OFFICE_URL: 'https://office.lokatalenta.id',
      },
      '',
    );
    expect(fromEnv).toEqual({
      lmsPsikotes: 'https://lms.lokatalenta.id',
      eventGateway: 'https://gw.lokatalenta.id',
      backlog: 'https://backlog.lokatalenta.id',
      sprintPlanner: 'https://sprint.lokatalenta.id',
      docs: 'https://docs.lokatalenta.id',
      office3d: 'https://office.lokatalenta.id',
    });

    const gwFromEnv = resolveGatewayEndpoints(
      { VITE_EVENT_GATEWAY_URL: 'https://gw.lokatalenta.id/' },
      '',
    );
    expect(gwFromEnv).toEqual({
      baseUrl: 'https://gw.lokatalenta.id',
      wsUrl: 'wss://gw.lokatalenta.id/ws',
      sseUrl: 'https://gw.lokatalenta.id/events/stream',
      snapshotUrl: 'https://gw.lokatalenta.id/snapshot',
      eventsUrl: 'https://gw.lokatalenta.id/events',
      healthUrl: 'https://gw.lokatalenta.id/health',
    });

    const gwOverridden = resolveGatewayEndpoints(
      {
        VITE_EVENT_GATEWAY_URL: 'https://gw.lokatalenta.id',
        VITE_EVENT_GATEWAY_WS_URL: 'wss://custom.ws/ws',
      },
      '?foo=bar&gateway=https%3A%2F%2Fpreview-gw.vercel.app%2F',
    );
    expect(gwOverridden).toEqual({
      baseUrl: 'https://preview-gw.vercel.app',
      wsUrl: 'wss://preview-gw.vercel.app/ws',
      sseUrl: 'https://preview-gw.vercel.app/events/stream',
      snapshotUrl: 'https://preview-gw.vercel.app/snapshot',
      eventsUrl: 'https://preview-gw.vercel.app/events',
      healthUrl: 'https://preview-gw.vercel.app/health',
    });
  });
});

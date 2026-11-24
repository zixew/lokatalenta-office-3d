import { describe, expect, it } from 'vitest';
import { WAYPOINT_BY_ID, ZONE_BY_ID } from '../src/data/buildingLayout.ts';
import { AGENTS, normalizeGatewayEvent } from '../src/data/contracts.ts';
import {
  getDailyRoutineTarget,
  mapEventToOfficeTarget,
  reconcileAgentSchedule,
} from '../src/navigation/routineScheduler.ts';

describe('Daily Company Routine Scheduler & Telemetry Overrides', () => {
  it('assigns valid zones, floors, activities, and existing waypoints for all 24 agents across full day sweep', () => {
    const timeSlices = [0, 520, 565, 630, 735, 765, 840, 945, 1000, 1050, 1200];
    for (const mins of timeSlices) {
      for (const agent of AGENTS) {
        const target = getDailyRoutineTarget(agent.id, mins);
        const zone = ZONE_BY_ID[target.zone];
        expect(zone).toBeDefined();
        expect(target.floor).toBe(zone.floor);
        const wp = WAYPOINT_BY_ID.get(target.waypointId);
        expect(wp, `Missing waypoint ${target.waypointId}`).toBeDefined();
        expect(wp?.floor).toBe(target.floor);
        expect(target.taskSummary.length).toBeGreaterThan(5);
      }
    }
  });

  it('staggers noon lunch and Dzuhur prayer across waves', () => {
    const wave1Even = getDailyRoutineTarget(0, 735);
    const wave1Odd = getDailyRoutineTarget(1, 735);
    expect(wave1Even.zone).toBe('cafeteria');
    expect(wave1Even.activity).toBe('dining');
    expect(wave1Odd.zone).not.toBe('cafeteria');

    const wave2Even = getDailyRoutineTarget(0, 765);
    const wave2Odd = getDailyRoutineTarget(1, 765);
    expect(wave2Odd.zone).toBe('cafeteria');
    expect(wave2Odd.activity).toBe('dining');
    expect(wave2Even.zone).toBe('musholla');
    expect(wave2Even.activity).toBe('praying');
  });

  it('prioritizes active telemetry overrides and expires cleanly back to routine after TTL', () => {
    const event = normalizeGatewayEvent({
      id: 'evt-override-1',
      timestamp: '2026-11-24T10:00:00.000Z',
      source: 'github',
      type: 'github.pr',
      divisionId: 'engineering',
      agentId: 5,
      entityId: 'PR-88',
      title: 'PR #88 Ready for Review',
      summary: 'Farel mempresentasikan PR #88 di Ruang Meeting Kaca',
      targetZone: 'boardroom',
      targetFloor: 2,
      severity: 'info',
      metadata: {},
    });

    const override = mapEventToOfficeTarget(event, 10000, 30000);
    expect(override.zone).toBe('meeting-rooms');
    expect(override.floor).toBe(2);
    expect(override.activity).toBe('meeting');
    expect(override.expiresAtMs).toBe(40000);

    const active = reconcileAgentSchedule(5, 630, override, 39999);
    expect(active.zone).toBe('meeting-rooms');
    expect(active.slotLabel).toBe('telemetry:evt-override-1');

    const expired = reconcileAgentSchedule(5, 630, override, 40000);
    const routine = getDailyRoutineTarget(5, 630);
    expect(expired).toEqual(routine);
  });
});

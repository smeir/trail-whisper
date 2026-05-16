import { describe, expect, it } from 'vitest'

import { sampleFitFile } from '@/test/fit-fixture'
import { parseFitFile, pointsToLineString } from './fit'

describe('pointsToLineString', () => {
  it('produces an SRID-tagged WKT LINESTRING in "lon lat" order', () => {
    expect(
      pointsToLineString([
        { lat: 47, lon: 8 },
        { lat: 48, lon: 9 },
      ]),
    ).toBe('SRID=4326;LINESTRING(8 47, 9 48)')
  })

  it('handles a single point', () => {
    expect(pointsToLineString([{ lat: 47.5, lon: 8.5 }])).toBe(
      'SRID=4326;LINESTRING(8.5 47.5)',
    )
  })
})

describe('parseFitFile (integration with fit-file-parser)', () => {
  it('parses a real FIT binary into a ParsedActivity', async () => {
    const file = sampleFitFile('morning-run.fit')

    const activity = await parseFitFile(file)

    expect(activity.name).toBe('morning-run.fit')
    expect(activity.sport).toBe('running')
    expect(activity.points).toHaveLength(3)
    expect(activity.points[0].lat).toBeCloseTo(47.0, 4)
    expect(activity.points[0].lon).toBeCloseTo(8.0, 4)
    expect(activity.points[2].lat).toBeCloseTo(47.002, 4)
    expect(activity.totalDistance).toBe(200)
    expect(new Date(activity.startedAt).getTime()).toBeLessThan(
      new Date(activity.endedAt).getTime(),
    )
  })

  it('maps unknown sports to "other"', async () => {
    const activity = await parseFitFile(sampleFitFile('x.fit', { sport: 99 }))
    expect(activity.sport).toBe('other')
  })

  it('rejects a FIT file without GPS points', async () => {
    await expect(
      parseFitFile(sampleFitFile('empty.fit', { points: [] })),
    ).rejects.toThrow(/No GPS points/)
  })
})

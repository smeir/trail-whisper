import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/lib/queryKeys'
import type { Coordinates } from '@/lib/types'
import { quantiseCoordinates } from '@/utils/geo'

/** Address keys in descending specificity; the first match wins and names the place type. */
const PLACE_KEYS = ['city', 'town', 'village', 'hamlet', 'locality'] as const

type PlaceType = (typeof PLACE_KEYS)[number] | 'other'

interface NominatimResponse {
  name?: string
  address?: Partial<Record<(typeof PLACE_KEYS)[number] | 'county' | 'state' | 'country', string>>
}

interface ReverseGeocodeResult {
  locality?: string
  region?: string
  placeType?: PlaceType
}

async function fetchReverseGeocode(position: Coordinates): Promise<ReverseGeocodeResult> {
  const searchParams = new URLSearchParams({
    format: 'jsonv2',
    lat: String(position.lat),
    lon: String(position.lon),
    zoom: '10',
    addressdetails: '1',
  })

  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${searchParams.toString()}`, {
    headers: {
      'Accept-Language': 'en',
    },
  })

  if (!response.ok) {
    throw new Error('Unable to reverse geocode location')
  }

  const data = (await response.json()) as NominatimResponse
  const placeKey = PLACE_KEYS.find((key) => data.address?.[key])

  return {
    locality: (placeKey && data.address?.[placeKey]) || data.name,
    region: data.address?.state ?? data.address?.county ?? data.address?.country,
    placeType: placeKey ?? 'other',
  }
}

export function useReverseGeocode(position?: Coordinates | null) {
  // Nominatim answers at town resolution, so the quantised point is both the cache
  // key and what gets looked up — full-precision floats would never cache-hit, and
  // Nominatim's usage policy does not forgive a request per GPS update.
  const point = quantiseCoordinates(position)

  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.reverseGeocode, point?.lat, point?.lon],
    queryFn: () => fetchReverseGeocode(point as Coordinates),
    enabled: point !== null,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
  })

  return {
    locality: data?.locality,
    region: data?.region,
    placeType: data?.placeType,
    isLoading,
  }
}

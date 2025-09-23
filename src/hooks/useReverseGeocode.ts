import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import type { Coordinates } from '@/lib/types'

interface NominatimResponse {
  display_name?: string
  name?: string
  address?: {
    city?: string
    town?: string
    village?: string
    hamlet?: string
    locality?: string
    county?: string
    state?: string
    country?: string
  }
}

type PlaceType = 'city' | 'town' | 'village' | 'hamlet' | 'locality' | 'other'

interface ReverseGeocodeResult {
  locality?: string
  region?: string
  displayName?: string
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
  let locality: string | undefined
  let placeType: PlaceType = 'other'

  if (data.address?.city) {
    locality = data.address.city
    placeType = 'city'
  } else if (data.address?.town) {
    locality = data.address.town
    placeType = 'town'
  } else if (data.address?.village) {
    locality = data.address.village
    placeType = 'village'
  } else if (data.address?.hamlet) {
    locality = data.address.hamlet
    placeType = 'hamlet'
  } else if (data.address?.locality) {
    locality = data.address.locality
    placeType = 'locality'
  }

  const region = data.address?.state ?? data.address?.county ?? data.address?.country

  return {
    locality: locality ?? data.name,
    region,
    displayName: data.display_name,
    placeType,
  }
}

export function useReverseGeocode(position?: Coordinates | null) {
  const query = useQuery({
    queryKey: ['reverse-geocode', position?.lat, position?.lon],
    queryFn: () => fetchReverseGeocode(position as Coordinates),
    enabled: Boolean(position?.lat && position?.lon),
    staleTime: 60 * 60 * 1000,
    retry: 1,
  })

  return useMemo(() => ({
    ...query,
    locality: query.data?.locality,
    region: query.data?.region,
    displayName: query.data?.displayName,
    placeType: query.data?.placeType,
  }), [query])
}

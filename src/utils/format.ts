import { format, formatDistanceToNowStrict, parseISO } from 'date-fns'

export function formatDistanceMeters(distance: number) {
  if (distance >= 1000) {
    return `${(distance / 1000).toFixed(1)} km`
  }
  return `${Math.round(distance)} m`
}

export function formatDateTime(value: string) {
  try {
    return format(parseISO(value), 'PP p')
  } catch (error) {
    return value
  }
}

export function formatRelative(value: string) {
  try {
    return formatDistanceToNowStrict(parseISO(value), { addSuffix: true })
  } catch (error) {
    return value
  }
}

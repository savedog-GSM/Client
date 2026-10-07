import type { Alert, RouteRecord, SensorData } from '../types'

const SENSOR_KEY = 'robodog_sensor_data'
const ALERT_KEY = 'robodog_alerts'
const ROUTE_RECORD_KEY = 'robodog_route_records'

export const getSensorData = (): SensorData[] => {
  const data = localStorage.getItem(SENSOR_KEY)
  return data ? JSON.parse(data) : []
}

export const saveSensorData = (sensor: SensorData) => {
  const data = getSensorData()
  localStorage.setItem(SENSOR_KEY, JSON.stringify([...data, sensor].slice(-500)))
}

export const getAlerts = (): Alert[] => {
  const data = localStorage.getItem(ALERT_KEY)
  return data ? JSON.parse(data) : []
}

export const saveAlert = (alert: Alert) => {
  const data = getAlerts()
  localStorage.setItem(ALERT_KEY, JSON.stringify([alert, ...data].slice(0, 100)))
}

export const getRouteRecords = (): RouteRecord[] => {
  const data = localStorage.getItem(ROUTE_RECORD_KEY)
  return data ? JSON.parse(data) : []
}

export const saveRouteRecord = (record: RouteRecord) => {
  const data = getRouteRecords()
  localStorage.setItem(ROUTE_RECORD_KEY, JSON.stringify([record, ...data]))
}
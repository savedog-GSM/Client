import type { Route } from '../types'

export const routes: Route[] = [
  {
    id: 'route-a',
    name: 'A → B → D',
    nodes: ['A', 'B', 'D'],
    distance: 18,
    averageRisk: 12,
    obstacleCount: 1,
    tiltScore: 4,
    executionCount: 8,
  },
  {
    id: 'route-b',
    name: 'A → C → D',
    nodes: ['A', 'C', 'D'],
    distance: 15,
    averageRisk: 37,
    obstacleCount: 4,
    tiltScore: 11,
    executionCount: 6,
  },
  {
    id: 'route-c',
    name: 'A → E → D',
    nodes: ['A', 'E', 'D'],
    distance: 21,
    averageRisk: 8,
    obstacleCount: 0,
    tiltScore: 3,
    executionCount: 10,
  },
  {
    id: 'route-d',
    name: 'A → F → D',
    nodes: ['A', 'F', 'D'],
    distance: 20,
    averageRisk: 19,
    obstacleCount: 2,
    tiltScore: 7,
    executionCount: 5,
  },
]
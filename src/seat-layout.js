// Shared seat coordinates. Each letter-garden bench has two independent places.
export const SEAT_LAYOUT = [
  { id: 'seat-0', x: 12.8, z: 7, height: 1.025, angle: -Math.PI / 2, label: '의자' },
  { id: 'seat-1', x: 17.2, z: 7, height: 1.025, angle: Math.PI / 2, label: '의자' },
  ...[-1, 1].flatMap(side => [-1, 1].map(spot => ({
    id: `bench-${side < 0 ? 'left' : 'right'}-${spot < 0 ? 'left' : 'right'}`,
    x: side * 5.3 + spot * .65,
    z: -22,
    height: 1.01,
    angle: Math.PI,
    label: '벤치',
    spot: spot < 0 ? '왼쪽 자리' : '오른쪽 자리',
  }))),
];

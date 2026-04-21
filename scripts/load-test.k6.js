import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 20,
  duration: '60s',
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.02'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

export default function () {
  const health = http.get(`${BASE_URL}/api/health`);
  check(health, {
    'health is 200': (res) => res.status === 200,
  });

  sleep(1);
}

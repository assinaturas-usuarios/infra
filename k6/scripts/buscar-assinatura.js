import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '2m', target: 200 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<100'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_ASSINATURA = 'http://localhost:8082';

const ASSINATURA_IDS = __ENV.ASSINATURA_IDS
  ? __ENV.ASSINATURA_IDS.split(',')
  : [];

export default function () {
  if (ASSINATURA_IDS.length === 0) {
    return;
  }

  const id = ASSINATURA_IDS[Math.floor(Math.random() * ASSINATURA_IDS.length)];
  const res = http.get(`${BASE_ASSINATURA}/v1/assinaturas/${id}`);

  check(res, {
    'status 200': (r) => r.status === 200,
    'tempo resposta < 100ms': (r) => r.timings.duration < 100,
  });

  sleep(0.5);
}

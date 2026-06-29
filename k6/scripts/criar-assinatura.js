import http from 'k6/http';
import { check, sleep } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_USUARIO = 'http://localhost:8081';
const BASE_ASSINATURA = 'http://localhost:8082';

export default function () {
  const usuarioPayload = JSON.stringify({
    nome: `Usuario ${uuidv4()}`,
    email: `${uuidv4()}@teste.com`,
  });

  const headers = { 'Content-Type': 'application/json' };

  const usuarioRes = http.post(`${BASE_USUARIO}/v1/usuarios`, usuarioPayload, { headers });
  check(usuarioRes, { 'usuario criado': (r) => r.status === 201 });

  if (usuarioRes.status === 201) {
    const usuario = JSON.parse(usuarioRes.body);

    const planos = ['BASICO', 'PREMIUM', 'FAMILIA'];
    const plano = planos[Math.floor(Math.random() * planos.length)];

    const assinaturaPayload = JSON.stringify({
      usuarioId: usuario.id,
      plano: plano,
    });

    const assinaturaRes = http.post(`${BASE_ASSINATURA}/v1/assinaturas`, assinaturaPayload, { headers });
    check(assinaturaRes, { 'assinatura criada': (r) => r.status === 201 });
  }

  sleep(1);
}

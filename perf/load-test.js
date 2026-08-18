/**
 * k6 load test — jalankan: k6 run perf/load-test.js (BASE_URL env).
 * Target: read-heavy surfaces tetap < 300ms p95 di 50 VU; mutation di-throttle.
 */
import http from "k6/http";
import { check } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 20 },
    { duration: "1m", target: 50 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<300"],
    http_req_failed: ["rate<0.01"],
  },
};

const BASE = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  const pages = ["/", "/mirror", "/origin", "/api/cif", "/api/search?q=layer", "/api/calibration", "/api/health"];
  const res = http.get(BASE + pages[Math.floor(Math.random() * pages.length)]);
  check(res, { "status 200": (r) => r.status === 200 });
}

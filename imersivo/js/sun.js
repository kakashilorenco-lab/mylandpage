import { CONFIG } from './config.js';

// Usa a biblioteca open-source SunCalc (github.com/mourner/suncalc)
const SC = () => window.SunCalc;
const TZ = CONFIG.fusoHorario;

// Data local do empreendimento (ano, mês 0-11, dia, minutos do dia) -> Date (UTC real)
export function localToDate(y, m, d, minutes) {
  return new Date(Date.UTC(y, m, d, 0, 0) + (minutes - TZ * 60) * 60000);
}

// Date -> 'HH:MM' no fuso do empreendimento
export function hhmm(date) {
  if (!date || isNaN(date)) return '--:--';
  const t = new Date(date.getTime() + TZ * 3600000);
  return String(t.getUTCHours()).padStart(2, '0') + ':' + String(t.getUTCMinutes()).padStart(2, '0');
}

export function minutesToHHMM(min) {
  min = ((Math.round(min) % 1440) + 1440) % 1440;
  return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
}

const DIRS = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'];
export function rumo(azNorteGraus) {
  return DIRS[Math.round((((azNorteGraus % 360) + 360) % 360) / 45) % 8];
}

// Vetor de direção (x = leste, y = cima, z = sul) a partir de azimute (rad, a partir do sul, positivo p/ oeste) e altitude
export function dirFromSunCalc(azimuth, altitude, out) {
  const azN = azimuth + Math.PI; // a partir do norte, horário
  const c = Math.cos(altitude);
  out.set(Math.sin(azN) * c, Math.sin(altitude), -Math.cos(azN) * c);
  return out;
}

export function solar(date) {
  const lat = CONFIG.lat, lon = CONFIG.lon;
  const sun = SC().getPosition(date, lat, lon);
  const moon = SC().getMoonPosition(date, lat, lon);
  const ill = SC().getMoonIllumination(date);
  // getTimes usa o meio-dia local; garantimos o dia certo
  const noonLocal = new Date(date.getTime());
  const times = SC().getTimes(noonLocal, lat, lon);
  const azSunN = (sun.azimuth * 180) / Math.PI + 180;
  const azMoonN = (moon.azimuth * 180) / Math.PI + 180;
  return {
    sunAlt: sun.altitude,
    sunAz: sun.azimuth,
    sunAltDeg: (sun.altitude * 180) / Math.PI,
    sunAzN: azSunN,
    moonAlt: moon.altitude,
    moonAz: moon.azimuth,
    moonAltDeg: (moon.altitude * 180) / Math.PI,
    moonAzN: azMoonN,
    moonFrac: ill.fraction,
    nascer: times.sunrise,
    poente: times.sunset,
    meioDia: times.solarNoon,
  };
}

// Estações no hemisfério sul
export const ESTACOES = {
  verao: { label: 'Verão', m: 11, d: 21 },
  outono: { label: 'Outono', m: 2, d: 20 },
  inverno: { label: 'Inverno', m: 5, d: 21 },
  primavera: { label: 'Primavera', m: 8, d: 22 },
};

export function periodo(altDeg) {
  if (altDeg < -12) return 'Noite';
  if (altDeg < -0.8) return 'Crepúsculo';
  if (altDeg < 8) return 'Hora dourada';
  return 'Dia';
}

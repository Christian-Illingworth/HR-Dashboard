// HARNESS ONLY: the dashboard on mock data with no SharePoint or Azure (research R14, T037).
// Query parameters: ?today=YYYY-MM-DD (default 2026-10-27), ?state=<SimulatedState>.
import { mountDashboard } from '../src/mount';
import { SampleDashboardClient } from '../src/data/SampleDashboardClient';
import { SIMULATED_STATES, StateSimulatingClient, type SimulatedState } from './StateSimulatingClient';
import f400 from '../../../design-kit/fonts/poppins-400.woff2?url';
import f500 from '../../../design-kit/fonts/poppins-500.woff2?url';
import f600 from '../../../design-kit/fonts/poppins-600.woff2?url';
import f700 from '../../../design-kit/fonts/poppins-700.woff2?url';
import f800 from '../../../design-kit/fonts/poppins-800.woff2?url';

const params = new URLSearchParams(location.search);
const today = params.get('today') ?? '2026-10-27';
const stateParam = params.get('state');
const state = SIMULATED_STATES.includes(stateParam as SimulatedState) ? (stateParam as SimulatedState) : null;

const client = new StateSimulatingClient(new SampleDashboardClient({ today }), state);

mountDashboard(document.getElementById('webpart')!, {
  client,
  noAccessContact: 'To ask for access, contact the HR team.',
  fonts: { 400: f400, 500: f500, 600: f600, 700: f700, 800: f800 },
});

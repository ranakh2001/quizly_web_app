import { createBrowserRouter } from 'react-router-dom';
import HomePage from './HomePage.jsx';

// Route table grows feature by feature starting Phase 6 (auth, student, teacher, admin).
export const router = createBrowserRouter([{ path: '/', element: <HomePage /> }]);

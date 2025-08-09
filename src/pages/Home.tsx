import { Navigate } from 'react-router-dom';

const Home = () => {
  // Redirect to chat page as the main interface
  return <Navigate to="/chat" replace />;
};

export default Home;

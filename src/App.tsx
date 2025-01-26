import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import Layout from './components/Layout';

// Lazy load components
const Home = lazy(() => import('@/pages/Home'));
const About = lazy(() => import('@/pages/About'));
const Contact = lazy(() => import('@/pages/Contact'));
const FormElementsShowcase = lazy(() => import('@/pages/FormElementsShowcase'));
const TooltipShowcase = lazy(() => import('@/pages/TooltipShowcase'));
const CardShowcase = lazy(() => import('@/pages/CardShowcase'));
const Inventory = lazy(() => import('@/pages/Inventory'));
const TagDisplaySettings = lazy(() => import('@/pages/TagDisplaySettings'));

const App = () => {
  return (
    <Router>
      <Layout>
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/form-elements-showcase" element={<FormElementsShowcase />} />
            <Route path="/tooltip-showcase" element={<TooltipShowcase />} />
            <Route path="/card-showcase" element={<CardShowcase />} />
            <Route path="/tag-display-settings" element={<TagDisplaySettings />} />
          </Routes>
        </Suspense>
      </Layout>
    </Router>
  );
};

export default App;
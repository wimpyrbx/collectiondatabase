import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import Layout from './components/Layout';
import { ExternalChangeMonitor } from '@/components/ExternalChangeMonitor';

// Lazy load components
const Home = lazy(() => import('@/pages/Home'));
const About = lazy(() => import('@/pages/About'));
const Contact = lazy(() => import('@/pages/Contact'));
const FormElementsShowcase = lazy(() => import('@/pages/FormElementsShowcase'));
const CardShowcase = lazy(() => import('@/pages/CardShowcase'));
const Inventory = lazy(() => import('@/pages/Inventory'));
const TagAdmin = lazy(() => import('@/pages/TagAdmin'));

const App = () => {
  return (
    <>
      <ExternalChangeMonitor />
      <Router>
        <Layout>
          <Suspense fallback={<div>Loading...</div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/tags" element={<TagAdmin />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/form-elements-showcase" element={<FormElementsShowcase />} />
              <Route path="/card-showcase" element={<CardShowcase />} />
            </Routes>
          </Suspense>
        </Layout>
      </Router>
    </>
  );
};

export default App;
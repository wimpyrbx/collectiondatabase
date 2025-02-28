import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { notifyInfo } from '@/utils/notifications';
import { FaInfo } from 'react-icons/fa';
import Layout from './components/Layout';
import { ExternalChangeMonitor } from '@/components/ExternalChangeMonitor';
import { NotificationProvider } from '@/components/providers/NotificationProvider';

// Lazy load components
const Home = lazy(() => import('@/pages/Home'));
// Uncomment these when the modules are available
// const Dashboard = lazy(() => import('@/pages/Dashboard'));
// const Products = lazy(() => import('@/pages/Products'));
// const ProductGroups = lazy(() => import('@/pages/ProductGroups'));
// const ProductTypes = lazy(() => import('@/pages/ProductTypes'));
const Inventory = lazy(() => import('@/pages/Inventory'));
const TagAdmin = lazy(() => import('@/pages/TagAdmin'));
const Sales = lazy(() => import('@/pages/Sales'));
const Purchases = lazy(() => import('@/pages/Purchases'));
const FormElementsShowcase = lazy(() => import('@/pages/FormElementsShowcase'));
const CardShowcase = lazy(() => import('@/pages/CardShowcase'));

// Create a notification example component
const NotificationExample = () => {
  return (
    <button
      onClick={() => notifyInfo('This is a test notification')}
      className="fixed bottom-4 right-4 bg-blue-500 text-white p-2 rounded-full"
    >
      <FaInfo />
    </button>
  );
};

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <Router>
          <NotificationExample />
          <ExternalChangeMonitor />
          <Layout>
            <Suspense fallback={<div>Loading...</div>}>
              <Routes>
                <Route path="/" element={<Home />} />
                {/* Uncomment these when the modules are available */}
                {/* <Route path="/dashboard" element={<Dashboard />} /> */}
                {/* <Route path="/products" element={<Products />} /> */}
                {/* <Route path="/product-groups" element={<ProductGroups />} /> */}
                {/* <Route path="/product-types" element={<ProductTypes />} /> */}
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/tag-admin" element={<TagAdmin />} />
                <Route path="/form-elements-showcase" element={<FormElementsShowcase />} />
                <Route path="/card-showcase" element={<CardShowcase />} />
                <Route path="/sales" element={<Sales />} />
                <Route path="/purchases" element={<Purchases />} />
              </Routes>
            </Suspense>
          </Layout>
        </Router>
      </NotificationProvider>
    </QueryClientProvider>
  );
};

export default App;
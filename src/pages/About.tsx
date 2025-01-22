// src/pages/About.tsx
import Page from '@/components/page/Page';
import { FaInfoCircle } from 'react-icons/fa';

const About = () => {
  return (
    <Page title="About" icon={<FaInfoCircle />}>
      <p>Learn more about us here.</p>
    </Page>
  );
};

export default About;
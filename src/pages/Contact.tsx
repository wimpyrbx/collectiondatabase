// src/pages/Contact.tsx
import Page from '@/components/page/Page';
import { FaEnvelope } from 'react-icons/fa';

const Contact = () => {
  return (
    <Page title="Contact" icon={<FaEnvelope />}>
      <p>Get in touch with us.</p>
    </Page>
  );
};

export default Contact;
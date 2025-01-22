import React, { useState } from 'react';
import Page from '@/components/page/Page';
import Card from '@/components/card/Card';
import Button from '@/components/ui/Button';
import { FaBook, FaCheck } from 'react-icons/fa';

const CardShowcase: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <Page
      title="Card Showcase"
      bgColor="bg-gray-800"
      subtitle="A showcase of the Card component"
      icon={<FaBook />}
      iconColor="text-yellow-600"
    >
      <div className="w-full">
        {/* Basic Card */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Basic Card</h2>
          <Card>
            <Card.Header title="Basic Card Header" />
            <Card.Body>
              This is a basic card with header and body content.
            </Card.Body>
          </Card>
        </section>

        {/* Card with Footer */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Card with Footer</h2>
          <Card>
            <Card.Header title="Card with Footer" />
            <Card.Body>
              This card includes a footer section.
            </Card.Body>
            <Card.Footer>
              <Button
                iconLeft={<FaCheck />}
                bgColor="bg-green-700"
                hoverBgColor={true}
              >Action</Button>
            </Card.Footer>
          </Card>
        </section>

        {/* Collapsible Card */}
        <section className="w-full">
          <h2 className="text-xl font-semibold mb-4">Collapsible Card</h2>
          <Card>
            <Card.Header 
              title="Collapsible Card"
              collapsible={true}
            />
            <Card.Body>
              This content can be collapsed by clicking the header.
            </Card.Body>
          </Card>
        </section>

        {/* Custom Styled Card */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Custom Styled Card</h2>
          <Card className="bg-blue-900">
            <Card.Header title="Custom Styled" />
            <Card.Body>
              This card has custom background styling.
            </Card.Body>
          </Card>
        </section>
      </div>
    </Page>
  );
};

export default CardShowcase; 
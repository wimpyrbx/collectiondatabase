import React, { useState } from 'react';
import Page from '@/components/page/Page';
import FormElement from '@/components/formelement/FormElement';

const FormElementsShowcase: React.FC = () => {
  return (
    <Page title="Form Elements Showcase">
      <div className="space-y-8">
        {/* Basic Text Input */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Basic Text Inputs</h2>
          <div className="space-y-4">
            <FormElement
              elementType="input"
              label="Standard Text Input"
              placeholder="Enter some text"
              onValueChange={(value) => console.log('Value changed:', value)}
            />
            
            <FormElement
              elementType="input"
              label="Disabled Input"
              placeholder="This input is disabled"
              disabled
            />

            <FormElement
              elementType="input"
              label="With Label Icon"
              placeholder="Enter username"
              labelIcon={<span>👤</span>}
            />

            <FormElement
              elementType="input"
              label="Numeric Only"
              placeholder="Enter numbers only"
              numericOnly
            />
          </div>
        </section>

        {/* Textarea */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Textarea</h2>
          <FormElement
            elementType="textarea"
            label="Multi-line Text"
            placeholder="Enter your message here..."
            rows={4}
          />
        </section>

        {/* Select Input */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Select Input</h2>
          <FormElement
            elementType="select"
            label="Choose an option"
            options={[
              { value: 'option1', label: 'Option 1' },
              { value: 'option2', label: 'Option 2' },
              { value: 'option3', label: 'Option 3' },
            ]}
          />
        </section>

        {/* Multiple List Selection */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Multiple List Selection</h2>
          <FormElement
            elementType="listmultiple"
            label="Multiple Selection"
            options={[
              { value: 'item1', label: 'Item 1' },
              { value: 'item2', label: 'Item 2' },
              { value: 'item3', label: 'Item 3' },
              { value: 'item4', label: 'Item 4' },
            ]}
            selectedOptions={['item1', 'item3']}
          />
        </section>

        {/* Single List Selection */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Single List Selection</h2>
          <FormElement
            elementType="listsingle"
            label="Single Selection"
            options={[
              { value: 'item1', label: 'Item 1' },
              { value: 'item2', label: 'Item 2' },
              { value: 'item3', label: 'Item 3' },
              { value: 'item4', label: 'Item 4' },
              { value: 'item5', label: 'Item 5' },
            ]}
            selectedOptions="item4"
          />
        </section>

        {/* Different Styles */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Styled Inputs</h2>
          <div className="space-y-4">
            <FormElement
              elementType="input"
              label="Custom Colors"
              bgColor="bg-blue-900"
              textColor="text-white"
              rounded="xl"
            />

            <FormElement
              elementType="input"
              label="Label Above"
              labelPosition="above"
            />

            <FormElement
              elementType="input"
              label="Custom Width"
              width="w-64"
            />
          </div>
        </section>
      </div>
    </Page>
  );
};

export default FormElementsShowcase; 
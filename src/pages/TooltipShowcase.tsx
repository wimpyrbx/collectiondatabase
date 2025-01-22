import React, { useRef, useState } from 'react';
import Page from '@/components/page/Page';
import { Tooltip } from '@/components/tooltip/Tooltip';

const TooltipShowcase: React.FC = () => {
  // Refs for all tooltip triggers
  const buttonRef1 = useRef<HTMLButtonElement>(null);
  const buttonRef2 = useRef<HTMLButtonElement>(null);
  const buttonRef3 = useRef<HTMLButtonElement>(null);
  const buttonRef4 = useRef<HTMLButtonElement>(null);
  const textRef1 = useRef<HTMLSpanElement>(null);
  const textRef2 = useRef<HTMLSpanElement>(null);
  const customRef1 = useRef<HTMLDivElement>(null);
  const customRef2 = useRef<HTMLDivElement>(null);

  // Hover states
  const [isHover1, setIsHover1] = useState(false);
  const [isHover2, setIsHover2] = useState(false);
  const [isHover3, setIsHover3] = useState(false);
  const [isHover4, setIsHover4] = useState(false);
  const [isHoverText1, setIsHoverText1] = useState(false);
  const [isHoverText2, setIsHoverText2] = useState(false);
  const [isHoverCustom1, setIsHoverCustom1] = useState(false);
  const [isHoverCustom2, setIsHoverCustom2] = useState(false);

  // Add new refs and hover states for theme examples
  const themeRef1 = useRef<HTMLDivElement>(null);
  const themeRef2 = useRef<HTMLDivElement>(null);
  const themeRef3 = useRef<HTMLDivElement>(null);
  const themeRef4 = useRef<HTMLDivElement>(null);
  const themeRef5 = useRef<HTMLDivElement>(null);

  const [isHoverTheme1, setIsHoverTheme1] = useState(false);
  const [isHoverTheme2, setIsHoverTheme2] = useState(false);
  const [isHoverTheme3, setIsHoverTheme3] = useState(false);
  const [isHoverTheme4, setIsHoverTheme4] = useState(false);
  const [isHoverTheme5, setIsHoverTheme5] = useState(false);

  return (
    <Page title="Tooltip Showcase">
      <div className="space-y-12">
        {/* Basic Tooltips */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Basic Tooltips</h2>
          <div className="flex space-x-4">
            <button
              ref={buttonRef1}
              className="px-4 py-2 bg-gray-700 rounded-md"
              onMouseEnter={() => setIsHover1(true)}
              onMouseLeave={() => setIsHover1(false)}
            >
              Hover me
            </button>
            <Tooltip
              text="Basic tooltip"
              elementRef={buttonRef1}
              isOpen={isHover1}
              placement="top"
            />
          </div>
        </section>

        {/* Different Placements */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Tooltip Placements</h2>
          <div className="grid grid-cols-2 gap-8 max-w-md">
            <button
              ref={buttonRef2}
              className="px-4 py-2 bg-gray-700 rounded-md"
              onMouseEnter={() => setIsHover2(true)}
              onMouseLeave={() => setIsHover2(false)}
            >
              Top Placement
            </button>
            <Tooltip
              text="Top tooltip"
              elementRef={buttonRef2}
              isOpen={isHover2}
              placement="top"
            />

            <button
              ref={buttonRef3}
              className="px-4 py-2 bg-gray-700 rounded-md"
              onMouseEnter={() => setIsHover3(true)}
              onMouseLeave={() => setIsHover3(false)}
            >
              Left Placement
            </button>
            <Tooltip
              text="Left tooltip"
              elementRef={buttonRef3}
              isOpen={isHover3}
              placement="left"
            />
          </div>
        </section>

        {/* Tooltips on Text */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Tooltips on Text</h2>
          <div className="space-y-4">
            <div>
              <span
                ref={textRef1}
                className="text-blue-400 cursor-help"
                onMouseEnter={() => setIsHoverText1(true)}
                onMouseLeave={() => setIsHoverText1(false)}
              >
                Hover over this text
              </span>
              <Tooltip
                text="Tooltip on text element"
                elementRef={textRef1}
                isOpen={isHoverText1}
                placement="top"
              />
            </div>
            <div>
              <span
                ref={textRef2}
                className="text-green-400 cursor-help"
                onMouseEnter={() => setIsHoverText2(true)}
                onMouseLeave={() => setIsHoverText2(false)}
              >
                Follow cursor tooltip
              </span>
              <Tooltip
                text="Following your cursor!"
                elementRef={textRef2}
                isOpen={isHoverText2}
                placement="follow-cursor"
                size="xs"
              />
            </div>
          </div>
        </section>

        {/* With Icon */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Tooltip with Icon</h2>
          <div className="flex space-x-4">
            <button
              ref={buttonRef4}
              className="px-4 py-2 bg-gray-700 rounded-md"
              onMouseEnter={() => setIsHover4(true)}
              onMouseLeave={() => setIsHover4(false)}
            >
              Help Icon
            </button>
            <Tooltip
              text="Helpful information here"
              elementRef={buttonRef4}
              isOpen={isHover4}
              icon={<span>ℹ️</span>}
              placement="right"
            />
          </div>
        </section>

        {/* Tooltip Themes */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Tooltip Themes</h2>
          <div className="flex flex-wrap gap-4">
            <div
              ref={themeRef1}
              className="px-4 py-2 bg-gray-700 rounded-md cursor-help"
              onMouseEnter={() => setIsHoverTheme1(true)}
              onMouseLeave={() => setIsHoverTheme1(false)}
            >
              Minimal Theme
            </div>
            <Tooltip
              text="Clean, minimal design"
              elementRef={themeRef1}
              isOpen={isHoverTheme1}
              placement="top"
              style="minimal"
            />

            <div
              ref={themeRef2}
              className="px-4 py-2 bg-gray-700 rounded-md cursor-help"
              onMouseEnter={() => setIsHoverTheme2(true)}
              onMouseLeave={() => setIsHoverTheme2(false)}
            >
              Frost Theme
            </div>
            <Tooltip
              text="Modern frost effect with blur"
              elementRef={themeRef2}
              isOpen={isHoverTheme2}
              placement="top"
              style="frost"
            />

            <div
              ref={themeRef3}
              className="px-4 py-2 bg-gray-700 rounded-md cursor-help"
              onMouseEnter={() => setIsHoverTheme3(true)}
              onMouseLeave={() => setIsHoverTheme3(false)}
            >
              Depth Theme
            </div>
            <Tooltip
              text="Sophisticated depth effect"
              elementRef={themeRef3}
              isOpen={isHoverTheme3}
              placement="top"
              style="depth"
            />

            <div
              ref={themeRef4}
              className="px-4 py-2 bg-gray-700 rounded-md cursor-help"
              onMouseEnter={() => setIsHoverTheme4(true)}
              onMouseLeave={() => setIsHoverTheme4(false)}
            >
              Outline Theme
            </div>
            <Tooltip
              text="Refined outline style"
              elementRef={themeRef4}
              isOpen={isHoverTheme4}
              placement="top"
              style="outline"
            />

            <div
              ref={themeRef5}
              className="px-4 py-2 bg-gray-700 rounded-md cursor-help"
              onMouseEnter={() => setIsHoverTheme5(true)}
              onMouseLeave={() => setIsHoverTheme5(false)}
            >
              Soft Theme
            </div>
            <Tooltip
              text="Soft, muted appearance"
              elementRef={themeRef5}
              isOpen={isHoverTheme5}
              placement="top"
              style="soft"
            />
          </div>
        </section>

        {/* Rich Content with Themes */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Rich Content with Themes</h2>
          <div className="flex space-x-4">
            <div
              ref={customRef1}
              className="px-4 py-2 bg-gray-700 rounded-md cursor-help"
              onMouseEnter={() => setIsHoverCustom1(true)}
              onMouseLeave={() => setIsHoverCustom1(false)}
            >
              Frost with Icon
            </div>
            <Tooltip
              text={
                <div className="flex items-center gap-2">
                  <span>❄️</span>
                  <span>Frosted glass effect</span>
                </div>
              }
              elementRef={customRef1}
              isOpen={isHoverCustom1}
              placement="top"
              style="frost"
            />
          </div>
        </section>
      </div>
    </Page>
  );
};

export default TooltipShowcase; 
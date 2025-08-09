import React from 'react';
import { useBreakpoint, useIsMobile, useIsTouchDevice } from '../utils/responsive';
import Card, { CardHeader, CardTitle, CardContent } from './ui/Card';

/**
 * Component to test and display responsive behavior
 * This can be used for debugging responsive design
 */
const ResponsiveTest: React.FC = () => {
  const { 
    currentBreakpoint, 
    windowWidth, 
    isMobile, 
    isTablet, 
    isDesktop, 
    isLargeDesktop 
  } = useBreakpoint();
  
  const isTouchDevice = useIsTouchDevice();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Responsive Design Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Breakpoint Information */}
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900 dark:text-white">Breakpoint Info</h4>
              <div className="text-sm space-y-1">
                <div>Current Breakpoint: <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{currentBreakpoint}</span></div>
                <div>Window Width: <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{windowWidth}px</span></div>
              </div>
            </div>

            {/* Device Type */}
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900 dark:text-white">Device Type</h4>
              <div className="text-sm space-y-1">
                <div>Mobile: <span className={`font-mono px-2 py-1 rounded ${isMobile ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>{isMobile ? 'Yes' : 'No'}</span></div>
                <div>Tablet: <span className={`font-mono px-2 py-1 rounded ${isTablet ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>{isTablet ? 'Yes' : 'No'}</span></div>
                <div>Desktop: <span className={`font-mono px-2 py-1 rounded ${isDesktop ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>{isDesktop ? 'Yes' : 'No'}</span></div>
                <div>Large Desktop: <span className={`font-mono px-2 py-1 rounded ${isLargeDesktop ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>{isLargeDesktop ? 'Yes' : 'No'}</span></div>
                <div>Touch Device: <span className={`font-mono px-2 py-1 rounded ${isTouchDevice ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>{isTouchDevice ? 'Yes' : 'No'}</span></div>
              </div>
            </div>
          </div>

          {/* Visual Breakpoint Indicators */}
          <div className="mt-6">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Visual Breakpoint Test</h4>
            <div className="space-y-2">
              <div className="block sm:hidden bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-2 rounded text-sm">
                📱 Mobile (&lt; 640px) - You should see this on mobile devices
              </div>
              <div className="hidden sm:block md:hidden bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 p-2 rounded text-sm">
                📱 Small (640px - 768px) - You should see this on small tablets
              </div>
              <div className="hidden md:block lg:hidden bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 p-2 rounded text-sm">
                💻 Medium (768px - 1024px) - You should see this on tablets
              </div>
              <div className="hidden lg:block xl:hidden bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 p-2 rounded text-sm">
                🖥️ Large (1024px - 1280px) - You should see this on small desktops
              </div>
              <div className="hidden xl:block 2xl:hidden bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 p-2 rounded text-sm">
                🖥️ Extra Large (1280px - 1536px) - You should see this on large desktops
              </div>
              <div className="hidden 2xl:block bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 p-2 rounded text-sm">
                🖥️ 2X Large (≥ 1536px) - You should see this on very large screens
              </div>
            </div>
          </div>

          {/* Responsive Grid Test */}
          <div className="mt-6">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Responsive Grid Test</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                <div key={item} className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-center">
                  Item {item}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Grid should show: 1 column on mobile, 2 on small screens, 3 on large screens, 4 on extra large screens
            </p>
          </div>

          {/* Responsive Text Test */}
          <div className="mt-6">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Responsive Text Test</h4>
            <div className="space-y-2">
              <p className="text-sm sm:text-base lg:text-lg xl:text-xl">
                This text should get larger on bigger screens
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Font sizes: text-sm (mobile) → text-base (small) → text-lg (large) → text-xl (extra large)
              </p>
            </div>
          </div>

          {/* Responsive Spacing Test */}
          <div className="mt-6">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Responsive Spacing Test</h4>
            <div className="bg-gray-100 dark:bg-gray-800 p-2 sm:p-4 lg:p-6 xl:p-8 rounded">
              <p className="text-center">This container has responsive padding</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                Padding: p-2 (mobile) → p-4 (small) → p-6 (large) → p-8 (extra large)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResponsiveTest;
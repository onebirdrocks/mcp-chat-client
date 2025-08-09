import React, { useState } from 'react';
import {
  Button,
  Input,
  Textarea,
  Select,
  Modal,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Badge,
  Spinner,
  Loading,
  Alert,
  Tooltip,
} from './index';

const UIShowcase: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectValue, setSelectValue] = useState('');
  const [textareaValue, setTextareaValue] = useState('');
  const [showAlert, setShowAlert] = useState(true);

  const selectOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        UI Components Showcase
      </h1>

      {/* Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Buttons</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
          </div>
        </CardContent>
      </Card>

      {/* Form Elements */}
      <Card>
        <CardHeader>
          <CardTitle>Form Elements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              label="Input Field"
              placeholder="Enter some text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              helperText="This is a helper text"
            />
            
            <Select
              label="Select Field"
              options={selectOptions}
              value={selectValue}
              onChange={(e) => setSelectValue(e.target.value)}
              placeholder="Choose an option"
            />
            
            <Textarea
              label="Textarea"
              placeholder="Enter multiple lines of text"
              value={textareaValue}
              onChange={(e) => setTextareaValue(e.target.value)}
              autoResize
              minRows={3}
              maxRows={6}
            />
          </div>
        </CardContent>
      </Card>

      {/* Badges and Status */}
      <Card>
        <CardHeader>
          <CardTitle>Badges and Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <Badge variant="default">Default</Badge>
            <Badge variant="primary">Primary</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="danger">Danger</Badge>
            <Spinner size="sm" />
            <Loading text="Loading..." size="sm" />
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {showAlert && (
        <Alert
          variant="info"
          title="Information"
          dismissible
          onDismiss={() => setShowAlert(false)}
        >
          This is an informational alert that can be dismissed.
        </Alert>
      )}

      {/* Tooltips and Modal */}
      <Card>
        <CardHeader>
          <CardTitle>Interactive Elements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Tooltip content="This is a tooltip" placement="top">
              <Button variant="outline">Hover for tooltip</Button>
            </Tooltip>
            
            <Button onClick={() => setIsModalOpen(true)}>
              Open Modal
            </Button>
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-gray-500">
            These components demonstrate various UI states and interactions.
          </p>
        </CardFooter>
      </Card>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Example Modal"
        size="md"
      >
        <div className="space-y-4">
          <p>This is a modal dialog with various interactive elements.</p>
          <Input
            placeholder="Type something in the modal"
            fullWidth
          />
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsModalOpen(false)}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UIShowcase;
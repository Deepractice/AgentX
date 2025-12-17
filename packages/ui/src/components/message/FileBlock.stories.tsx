import type { Meta, StoryObj } from "@storybook/react";
import { FileBlock } from "./FileBlock";

// React needed for JSX in render functions

const meta: Meta<typeof FileBlock> = {
  title: "Message/FileBlock",
  component: FileBlock,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Display file attachment in message content with file type icon, filename, and download button.",
      },
    },
  },
  argTypes: {
    data: {
      control: "text",
      description: "File data (base64 encoded)",
    },
    mediaType: {
      control: "text",
      description: "File MIME type",
    },
    filename: {
      control: "text",
      description: "Display filename",
    },
  },
};

export default meta;
type Story = StoryObj<typeof FileBlock>;

// Sample base64 data (minimal valid data for demo)
const sampleBase64 = "SGVsbG8gV29ybGQh"; // "Hello World!"

export const PDFFile: Story = {
  args: {
    data: sampleBase64,
    mediaType: "application/pdf",
    filename: "document.pdf",
  },
  parameters: {
    docs: {
      description: {
        story: "PDF file with document icon.",
      },
    },
  },
};

export const TextFile: Story = {
  args: {
    data: sampleBase64,
    mediaType: "text/plain",
    filename: "readme.txt",
  },
  parameters: {
    docs: {
      description: {
        story: "Plain text file.",
      },
    },
  },
};

export const JSONFile: Story = {
  args: {
    data: sampleBase64,
    mediaType: "application/json",
    filename: "config.json",
  },
  parameters: {
    docs: {
      description: {
        story: "JSON file.",
      },
    },
  },
};

export const CSVFile: Story = {
  args: {
    data: sampleBase64,
    mediaType: "text/csv",
    filename: "data.csv",
  },
  parameters: {
    docs: {
      description: {
        story: "CSV spreadsheet file.",
      },
    },
  },
};

export const WordDocument: Story = {
  args: {
    data: sampleBase64,
    mediaType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    filename: "report.docx",
  },
  parameters: {
    docs: {
      description: {
        story: "Microsoft Word document.",
      },
    },
  },
};

export const ExcelSpreadsheet: Story = {
  args: {
    data: sampleBase64,
    mediaType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    filename: "spreadsheet.xlsx",
  },
  parameters: {
    docs: {
      description: {
        story: "Microsoft Excel spreadsheet.",
      },
    },
  },
};

export const ImageFile: Story = {
  args: {
    data: sampleBase64,
    mediaType: "image/png",
    filename: "screenshot.png",
  },
  parameters: {
    docs: {
      description: {
        story: "Image file displayed as file block (not inline image).",
      },
    },
  },
};

export const LongFilename: Story = {
  args: {
    data: sampleBase64,
    mediaType: "application/pdf",
    filename: "this-is-a-very-long-filename-that-should-be-truncated-properly.pdf",
  },
  parameters: {
    docs: {
      description: {
        story: "Long filename is truncated with ellipsis.",
      },
    },
  },
};

export const NoFilename: Story = {
  args: {
    data: sampleBase64,
    mediaType: "application/pdf",
  },
  parameters: {
    docs: {
      description: {
        story: "Auto-generated filename when not provided.",
      },
    },
  },
};

export const MultipleFiles: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <FileBlock data={sampleBase64} mediaType="application/pdf" filename="document.pdf" />
      <FileBlock data={sampleBase64} mediaType="text/csv" filename="data.csv" />
      <FileBlock data={sampleBase64} mediaType="application/json" filename="config.json" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Multiple files displayed together.",
      },
    },
  },
};

export const InMessageContext: Story = {
  render: () => (
    <div className="max-w-md p-4 rounded-lg bg-muted/30 border border-border">
      <p className="text-sm mb-2">Here are the files you requested:</p>
      <div className="space-y-2 my-2">
        <FileBlock data={sampleBase64} mediaType="application/pdf" filename="report.pdf" />
        <FileBlock data={sampleBase64} mediaType="text/csv" filename="data.csv" />
      </div>
      <p className="text-sm mt-2">Click the download button to save them.</p>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "FileBlock used within a message context.",
      },
    },
  },
};

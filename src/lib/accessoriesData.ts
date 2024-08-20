/* eslint-disable @typescript-eslint/no-explicit-any */
export const accessoriesData: {
  [key: string]: string[];
  laptop: string[];
  printer: string[];
  desktop_pc: string[];
  electric_typewriter: string[];
} = {
  laptop: [
    "Bag",
    "Charger",
    "Cooling pad",
    "External mouse",
    "Keyboard cover",
    "Laptop stand",
    "USB hub",
    "External hard drive",
    "Internal hard drive",
    "Solid state drive (SSD)",
    "RAM",
    "Webcam",
    "Screen protector",
    "Portable battery pack",
    "Docking station",
  ],
  printer: [
    "CISS ink system",
    "USB cable",
    "Power cord",
    "Toner cartridges",
    "Paper trays",
    "Printhead",
    "Cleaning kit",
    "Wireless adapter",
    "Duplexer",
    "Printer stand",
    "Maintenance kit",
  ],
  desktop_pc: [
    "Monitor",
    "Keyboard",
    "Mouse",
    "Graphics card",
    "External hard drive",
    "Internal hard drive",
    "Solid state drive (SSD)",
    "RAM",
    "Power supply unit",
    "Cooling fans",
    "CPU cooler",
    "USB hub",
    "Speakers",
    "Webcam",
  ],
  electric_typewriter: [
    "Ribbons",
    "Correction tape",
    "Dust cover",
    "Power cord",
    "Typing paper",
    "Replacement keys",
    "Printwheel",
    "Carrying case",
    "Cleaning kit",
    "Platen knob",
  ],
};

export const accessorySubOptions: {
  "External hard drive": string[];
  "Internal hard drive": string[];
  "Solid state drive (SSD)": string[];
  RAM: {
    boards: string[];
    sizes: {
      [key: string]: string[];
    };
    frequencies: {
      [key: string]: string[];
    };
  };
  "Graphics card": {
    [key: string]: string[];
  };
  [key: string]: any;
} = {
  "External hard drive": ["256GB", "512GB", "1TB", "2TB", "4TB", "6TB", "8TB"],
  "Internal hard drive": ["256GB", "512GB", "1TB", "2TB", "4TB", "6TB", "8TB"],
  "Solid state drive (SSD)": ["128GB", "256GB", "512GB", "1TB", "2TB"],
  RAM: {
    boards: ["DDR3", "DDR4", "DDR5"],
    sizes: {
      DDR3: ["4GB", "8GB", "16GB"],
      DDR4: ["8GB", "16GB", "32GB"],
      DDR5: ["16GB", "32GB", "64GB"],
    },
    frequencies: {
      DDR3: ["1600MHz", "1866MHz", "2133MHz"],
      DDR4: ["2400MHz", "3200MHz", "3600MHz"],
      DDR5: ["4800MHz", "5200MHz", "5600MHz"],
    },
  },
  "Graphics card": {
    NVIDIA: [
      "GeForce GTX 1050",
      "GeForce GTX 1060",
      "GeForce GTX 1070",
      "GeForce GTX 1080",
      "GeForce RTX 2060",
      "GeForce RTX 2070",
      "GeForce RTX 2080",
      "GeForce RTX 3060",
      "GeForce RTX 3070",
      "GeForce RTX 3080",
      "GeForce RTX 3090",
    ],
    AMD: [
      "Radeon RX 560",
      "Radeon RX 570",
      "Radeon RX 580",
      "Radeon RX 590",
      "Radeon RX 5500 XT",
      "Radeon RX 5600 XT",
      "Radeon RX 5700",
      "Radeon RX 5700 XT",
      "Radeon RX 6700 XT",
      "Radeon RX 6800",
      "Radeon RX 6800 XT",
      "Radeon RX 6900 XT",
    ],
  },
};

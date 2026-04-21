const User = require('../models/user.model');
const Product = require('../models/product.model');
const Sale = require('../models/sale.model');
const Settings = require('../models/settings.model');
const { connectDatabase } = require('../config/db');
const { ROLES } = require('../constants/roles');

const sampleProducts = [
  {
    name: 'Samsung 43" 4K Smart TV',
    category: 'Television',
    sku: 'TV-SAM-43-4K',
    barcode: '8901234567001',
    stock: 8,
    lowStockLimit: 3,
    cp: 26500,
    sp: 31999,
    image: { url: '', publicId: '' },
  },
  {
    name: 'Sony Soundbar X200',
    category: 'Audio',
    sku: 'AUD-SONY-X200',
    barcode: '8901234567002',
    stock: 14,
    lowStockLimit: 5,
    cp: 7200,
    sp: 9499,
    image: { url: '', publicId: '' },
  },
  {
    name: 'Dell Inspiron Laptop 15',
    category: 'Computers',
    sku: 'LAP-DELL-15',
    barcode: '8901234567003',
    stock: 5,
    lowStockLimit: 2,
    cp: 39500,
    sp: 45999,
    image: { url: '', publicId: '' },
  },
  {
    name: 'Boat Airdopes Pro',
    category: 'Accessories',
    sku: 'ACC-BOAT-PRO',
    barcode: '8901234567004',
    stock: 25,
    lowStockLimit: 10,
    cp: 1200,
    sp: 1899,
    image: { url: '', publicId: '' },
  },
  {
    name: 'LG Double Door Refrigerator',
    category: 'Appliances',
    sku: 'APP-LG-DDR',
    barcode: '8901234567005',
    stock: 2,
    lowStockLimit: 2,
    cp: 28900,
    sp: 34500,
    image: { url: '', publicId: '' },
  },
];

async function seed() {
  await connectDatabase();
  await Promise.all([
    User.deleteMany({}),
    Product.deleteMany({}),
    Sale.deleteMany({}),
    Settings.deleteMany({}),
  ]);

  const admin = await User.create({
    name: 'Mujahid Owner',
    email: 'admin@mujahidgoods.com',
    password: 'Admin@123',
    role: ROLES.ADMIN,
  });

  await User.create({
    name: 'Sales Staff',
    email: 'staff@mujahidgoods.com',
    password: 'Staff@123',
    role: ROLES.STAFF,
  });

  const products = await Product.insertMany(sampleProducts);

  await Settings.create({
    shopCode: 'default',
    shopName: 'Mujahid Electronic Goods',
    address: '12 Station Road, Kolkata',
    contactPhone: '+91 98300 12345',
    contactEmail: 'sales@mujahidgoods.com',
    taxRate: 18,
    darkMode: false,
  });

  await Sale.create({
    items: [
      {
        product: products[0]._id,
        name: products[0].name,
        category: products[0].category,
        sku: products[0].sku,
        quantity: 1,
        price: products[0].sp,
        costPrice: products[0].cp,
        subtotal: products[0].sp,
        profit: products[0].sp - products[0].cp,
      },
      {
        product: products[1]._id,
        name: products[1].name,
        category: products[1].category,
        sku: products[1].sku,
        quantity: 2,
        price: products[1].sp,
        costPrice: products[1].cp,
        subtotal: products[1].sp * 2,
        profit: (products[1].sp - products[1].cp) * 2,
      },
    ],
    subtotal: products[0].sp + products[1].sp * 2,
    taxRate: 18,
    tax: Number(((products[0].sp + products[1].sp * 2) * 0.18).toFixed(2)),
    total: Number(((products[0].sp + products[1].sp * 2) * 1.18).toFixed(2)),
    profit:
      (products[0].sp - products[0].cp) +
      (products[1].sp - products[1].cp) * 2,
    paymentMethod: 'cash',
    createdBy: admin._id,
    receiptMeta: {
      shopName: 'Mujahid Electronic Goods',
      address: '12 Station Road, Kolkata',
      contactPhone: '+91 98300 12345',
      contactEmail: 'sales@mujahidgoods.com',
      taxRate: 18,
    },
  });

  // eslint-disable-next-line no-console
  console.log('Seed complete');
  process.exit(0);
}

seed().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed', error);
  process.exit(1);
});

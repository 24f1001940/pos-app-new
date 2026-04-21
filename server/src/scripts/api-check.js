const request = require('supertest');

const app = require('../app');
const { connectDatabase } = require('../config/db');

async function runApiChecks() {
  await connectDatabase();

  const failures = [];
  const checks = [];
  const client = request(app);

  async function check(label, runner, expectedStatus) {
    try {
      const response = await runner();
      const pass = Array.isArray(expectedStatus)
        ? expectedStatus.includes(response.status)
        : response.status === expectedStatus;

      checks.push({ label, status: response.status, pass });

      if (!pass) {
        failures.push({
          label,
          expected: Array.isArray(expectedStatus) ? expectedStatus.join(', ') : expectedStatus,
          actual: response.status,
          body: response.body,
        });
      }

      return response;
    } catch (error) {
      checks.push({ label, status: 'error', pass: false });
      failures.push({ label, error: error.message });
      return null;
    }
  }

  await check('GET /api/health', () => client.get('/api/health'), 200);
  await check('GET /api/auth/bootstrap', () => client.get('/api/auth/bootstrap'), 200);

  const loginRes = await check(
    'POST /api/auth/login',
    () =>
      client
        .post('/api/auth/login')
        .send({ email: 'admin@mujahidgoods.com', password: 'Admin@123' }),
    200,
  );

  if (!loginRes?.body?.token) {
    failures.push({ label: 'Auth bootstrap', error: 'Could not obtain admin token' });
  }

  const token = loginRes?.body?.token;
  const refreshToken = loginRes?.body?.refreshToken;
  const auth = token ? { Authorization: `Bearer ${token}` } : {};

  await check('GET /api/auth/me', () => client.get('/api/auth/me').set(auth), 200);
  if (refreshToken) {
    await check(
      'POST /api/auth/refresh',
      () => client.post('/api/auth/refresh').send({ refreshToken }),
      200,
    );
  }
  await check('GET /api/auth/activity-logs', () => client.get('/api/auth/activity-logs').set(auth), 200);

  await check(
    'POST /api/auth/register',
    () =>
      client
        .post('/api/auth/register')
        .set(auth)
        .send({
          name: 'API Check User',
          email: `api-check-${Date.now()}@mujahidgoods.local`,
          password: 'ApiCheck@123',
          role: 'staff',
        }),
    201,
  );

  const productsRes = await check('GET /api/products', () => client.get('/api/products').set(auth), 200);
  const sampleProduct = productsRes?.body?.products?.[0];

  const createProductRes = await check(
    'POST /api/products',
    () =>
      client
        .post('/api/products')
        .set(auth)
        .send({
          name: `API Product ${Date.now()}`,
          category: 'Accessories',
          stock: 40,
          lowStockLimit: 5,
          cp: 800,
          sp: 1200,
          supplier: { name: 'API Supplier', email: 'api@supplier.local' },
          image: { url: '', publicId: '' },
        }),
    201,
  );

  const createdProductId = createProductRes?.body?.id;
  if (createdProductId) {
    await check(
      'PUT /api/products/:id',
      () =>
        client
          .put(`/api/products/${createdProductId}`)
          .set(auth)
          .send({
            name: 'API Product Updated',
            category: 'Accessories',
            stock: 42,
            lowStockLimit: 5,
            cp: 800,
            sp: 1250,
            image: { url: '', publicId: '' },
          }),
      200,
    );

    await check('GET /api/products/:id/history', () => client.get(`/api/products/${createdProductId}/history`).set(auth), 200);
  }

  await check('GET /api/inventory/summary', () => client.get('/api/inventory/summary').set(auth), 200);
  const warehousesRes = await check('GET /api/inventory/warehouses', () => client.get('/api/inventory/warehouses').set(auth), 200);

  const newWarehouseRes = await check(
    'POST /api/inventory/warehouses',
    () =>
      client
        .post('/api/inventory/warehouses')
        .set(auth)
        .send({ name: `API Warehouse ${Date.now()}`, address: 'API Zone', contactPhone: '+911111111111' }),
    201,
  );

  const fromWarehouseId = warehousesRes?.body?.warehouses?.find((warehouse) => warehouse.isDefault)?.id
    || warehousesRes?.body?.warehouses?.[0]?.id;
  const toWarehouseId = newWarehouseRes?.body?.id;
  const transferProductId = sampleProduct?.id || createdProductId;

  if (fromWarehouseId && toWarehouseId && transferProductId) {
    await check(
      'POST /api/inventory/transfers',
      () =>
        client
          .post('/api/inventory/transfers')
          .set(auth)
          .send({
            productId: transferProductId,
            fromWarehouseId,
            toWarehouseId,
            quantity: 1,
            notes: 'API transfer check',
          }),
      201,
    );

    await check(
      'GET /api/inventory/products/:productId/movements',
      () => client.get(`/api/inventory/products/${transferProductId}/movements`).set(auth),
      200,
    );
  }

  const customersRes = await check('GET /api/customers', () => client.get('/api/customers').set(auth), 200);

  const createCustomerRes = await check(
    'POST /api/customers',
    () =>
      client
        .post('/api/customers')
        .set(auth)
        .send({
          name: `API Customer ${Date.now()}`,
          email: `customer-${Date.now()}@mail.local`,
          phone: '+919900000001',
          address: 'API Street',
          tags: ['api', 'check'],
          notes: 'created by api-check',
          active: true,
        }),
    201,
  );

  const customerId = createCustomerRes?.body?.id || customersRes?.body?.customers?.[0]?.id;
  if (customerId) {
    await check('GET /api/customers/:id', () => client.get(`/api/customers/${customerId}`).set(auth), 200);
    await check(
      'PUT /api/customers/:id',
      () =>
        client
          .put(`/api/customers/${customerId}`)
          .set(auth)
          .send({
            name: 'API Customer Updated',
            email: `customer-updated-${Date.now()}@mail.local`,
            phone: '+919900000002',
            address: 'API Street Updated',
            tags: ['api', 'updated'],
            notes: 'updated by api-check',
            active: true,
          }),
      200,
    );
    await check('GET /api/customers/:id/sales', () => client.get(`/api/customers/${customerId}/sales`).set(auth), 200);
  }

  const draftsRes = await check('GET /api/pos-drafts', () => client.get('/api/pos-drafts').set(auth), 200);
  const createDraftRes = await check(
    'POST /api/pos-drafts',
    () =>
      client
        .post('/api/pos-drafts')
        .set(auth)
        .send({
          title: 'API Draft',
          items: [
            {
              productId: transferProductId,
              quantity: 1,
            },
          ],
          customerName: 'Draft Customer',
          taxRate: 18,
          discountType: 'none',
          discountValue: 0,
        }),
    201,
  );

  const draftId = createDraftRes?.body?.id || draftsRes?.body?.drafts?.[0]?.id;
  if (draftId) {
    await check(
      'PUT /api/pos-drafts/:id',
      () =>
        client
          .put(`/api/pos-drafts/${draftId}`)
          .set(auth)
          .send({
            title: 'API Draft Updated',
            items: [{ productId: transferProductId, quantity: 2 }],
            customerName: 'Draft Customer Updated',
            taxRate: 18,
            discountType: 'flat',
            discountValue: 10,
          }),
      200,
    );

    await check('DELETE /api/pos-drafts/:id', () => client.delete(`/api/pos-drafts/${draftId}`).set(auth), 200);
  }

  await check('GET /api/sales', () => client.get('/api/sales').set(auth), 200);
  let createdSaleId = null;
  if (transferProductId) {
    const saleRes = await check(
      'POST /api/sales',
      () =>
        client
          .post('/api/sales')
          .set(auth)
          .send({
            items: [{ productId: transferProductId, quantity: 1 }],
            taxRate: 18,
            paymentMethod: 'cash',
            customerId,
            discountType: 'none',
            discountValue: 0,
            amountPaid: 0,
            notes: 'API sale check',
          }),
      201,
    );

    createdSaleId = saleRes?.body?.id;
  }

  if (createdSaleId) {
    await check('DELETE /api/sales/:id', () => client.delete(`/api/sales/${createdSaleId}`).set(auth), 200);
  }

  const notificationsRes = await check('GET /api/notifications', () => client.get('/api/notifications').set(auth), 200);
  const notificationId = notificationsRes?.body?.notifications?.[0]?.id;
  if (notificationId) {
    await check(
      'PATCH /api/notifications/:id/read',
      () => client.patch(`/api/notifications/${notificationId}/read`).set(auth),
      200,
    );
  }
  await check('PATCH /api/notifications/read-all', () => client.patch('/api/notifications/read-all').set(auth), 200);
  await check('POST /api/notifications/daily-summary', () => client.post('/api/notifications/daily-summary').set(auth), 200);

  await check('GET /api/dashboard', () => client.get('/api/dashboard').set(auth), 200);
  await check('GET /api/analytics/overview', () => client.get('/api/analytics/overview').set(auth), 200);
  await check('GET /api/analytics/export', () => client.get('/api/analytics/export?report=sales').set(auth), 200);
  await check('GET /api/ai/insights', () => client.get('/api/ai/insights').set(auth), 200);

  const settingsRes = await check('GET /api/settings', () => client.get('/api/settings').set(auth), 200);
  const currentSettings = settingsRes?.body || {};
  await check(
    'PUT /api/settings',
    () =>
      client
        .put('/api/settings')
        .set(auth)
        .send({
          shopName: currentSettings.shopName || 'Mujahid Electronic Goods',
          address: currentSettings.address || 'API Address',
          contactPhone: currentSettings.contactPhone || '+919900000003',
          contactEmail: currentSettings.contactEmail || 'settings@mujahidgoods.local',
          taxRate: Number(currentSettings.taxRate || 18),
          currency: currentSettings.currency || 'INR',
          darkMode: Boolean(currentSettings.darkMode),
          enableLowStockPopup: Boolean(currentSettings.enableLowStockPopup ?? true),
          enableEmailAlerts: Boolean(currentSettings.enableEmailAlerts ?? false),
          lowStockEmail: currentSettings.lowStockEmail || 'alerts@mujahidgoods.local',
          receiptFooter: currentSettings.receiptFooter || 'Thanks from API check',
        }),
    200,
  );
  await check('GET /api/settings/backup', () => client.get('/api/settings/backup').set(auth), 200);

  const financeSuppliersRes = await check('GET /api/finance/suppliers', () => client.get('/api/finance/suppliers').set(auth), 200);
  await check('GET /api/finance/summary', () => client.get('/api/finance/summary').set(auth), 200);
  await check('GET /api/finance/expenses', () => client.get('/api/finance/expenses').set(auth), 200);
  await check('GET /api/finance/purchase-orders', () => client.get('/api/finance/purchase-orders').set(auth), 200);

  const newSupplierRes = await check(
    'POST /api/finance/suppliers',
    () =>
      client
        .post('/api/finance/suppliers')
        .set(auth)
        .send({
          name: `API Finance Supplier ${Date.now()}`,
          email: `finance-supplier-${Date.now()}@mail.local`,
          phone: '+919900000004',
          address: 'Finance Zone',
          paymentTermsDays: 30,
          openingBalance: 1000,
          notes: 'api check supplier',
          active: true,
        }),
    201,
  );

  const supplierId = newSupplierRes?.body?.id || financeSuppliersRes?.body?.suppliers?.[0]?.id;
  if (supplierId) {
    await check(
      'PUT /api/finance/suppliers/:id',
      () =>
        client
          .put(`/api/finance/suppliers/${supplierId}`)
          .set(auth)
          .send({
            name: 'API Finance Supplier Updated',
            email: `finance-supplier-updated-${Date.now()}@mail.local`,
            phone: '+919900000005',
            address: 'Finance Zone Updated',
            paymentTermsDays: 35,
            openingBalance: 1200,
            notes: 'api check supplier updated',
            active: true,
          }),
      200,
    );
  }

  await check(
    'POST /api/finance/expenses',
    () =>
      client
        .post('/api/finance/expenses')
        .set(auth)
        .send({
          title: 'API Expense Check',
          category: 'Utilities',
          amount: 1200,
          paymentMethod: 'cash',
          paidTo: 'Utility Provider',
          notes: 'api expense check',
          expenseDate: new Date().toISOString(),
        }),
    201,
  );

  const warehouseIdForPo = fromWarehouseId || warehousesRes?.body?.warehouses?.[0]?.id;
  const poRes = await check(
    'POST /api/finance/purchase-orders',
    () =>
      client
        .post('/api/finance/purchase-orders')
        .set(auth)
        .send({
          supplierId,
          warehouseId: warehouseIdForPo,
          items: [{ productId: transferProductId, quantity: 2, unitCost: 500 }],
          taxRate: 5,
          amountPaid: 500,
          expectedDate: new Date(Date.now() + 86400000).toISOString(),
          notes: 'api purchase order check',
          status: 'ordered',
        }),
    201,
  );

  const purchaseOrderId = poRes?.body?.id;
  if (purchaseOrderId) {
    await check(
      'PATCH /api/finance/purchase-orders/:id/status',
      () =>
        client
          .patch(`/api/finance/purchase-orders/${purchaseOrderId}/status`)
          .set(auth)
          .send({ status: 'received' }),
      200,
    );
  }

  await check(
    'POST /api/uploads/image (validation)',
    () => client.post('/api/uploads/image').set(auth),
    400,
  );

  await check('POST /api/auth/logout-all', () => client.post('/api/auth/logout-all').set(auth), 200);

  const total = checks.length;
  const passed = checks.filter((item) => item.pass).length;
  const failed = failures.length;

  // eslint-disable-next-line no-console
  console.log('\nAPI Check Summary');
  // eslint-disable-next-line no-console
  console.table(checks);
  // eslint-disable-next-line no-console
  console.log(`Passed: ${passed}/${total}`);

  if (failed > 0) {
    // eslint-disable-next-line no-console
    console.error('\nAPI Check Failures');
    // eslint-disable-next-line no-console
    console.dir(failures, { depth: 4 });
    process.exit(1);
  }

  process.exit(0);
}

runApiChecks().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('API check failed with fatal error', error);
  process.exit(1);
});

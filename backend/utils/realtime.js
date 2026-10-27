// Socket.io room names and emit helpers. Every event goes to a specific room —
// never io.emit() — so order and customer data only reach the people allowed to see it.
//   restaurant-<id>        all logged-in staff (admin, waiter, kitchen)
//   table-<id>-<number>    customers seated at that table (customer data stripped)
//   customer-<id>          one customer's own devices

const staffRoom = (restaurantId) => `restaurant-${restaurantId}`;
const tableRoom = (restaurantId, tableNumber) => `table-${restaurantId}-${tableNumber}`;
const customerRoom = (customerId) => `customer-${customerId}`;

// What a customer at the table is allowed to see of an order.
const publicOrder = (order) => {
  const o = order.toObject ? order.toObject() : { ...order };
  return {
    _id: o._id,
    orderNumber: o.orderNumber,
    orderType: o.orderType,
    tableNumber: o.tableNumber,
    status: o.status,
    items: (o.items || []).map(i => ({
      _id: i._id,
      menuItemId: i.menuItemId,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      notes: i.notes,
      served: i.served,
      batchNumber: i.batchNumber
    })),
    totalAmount: o.totalAmount,
    batchCount: o.batchCount,
    billRequested: o.billRequested,
    billRequestedAt: o.billRequestedAt,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt
  };
};

// Fields of a customer profile that the customer's own app needs.
const publicCustomer = (customer) => {
  const c = customer.toObject ? customer.toObject() : { ...customer };
  return {
    _id: c._id,
    customerId: c.customerId,
    name: c.name,
    phone: c.phone,
    rewardToken: c.rewardToken,
    totalStamps: c.totalStamps,
    maxStampsPerCard: c.maxStampsPerCard,
    rewards: c.rewards,
    activeTable: c.activeTable,
    lastVisit: c.lastVisit,
    createdAt: c.createdAt
  };
};

function emitOrder(io, event, order) {
  if (!io || !order) return;
  io.to(staffRoom(order.restaurantId)).emit(event, order);
  if (order.tableNumber) {
    io.to(tableRoom(order.restaurantId, order.tableNumber)).emit(event, publicOrder(order));
  }
}

function emitToStaff(io, restaurantId, event, payload) {
  if (!io) return;
  io.to(staffRoom(restaurantId)).emit(event, payload);
}

function emitCustomerUpdate(io, customer) {
  if (!io || !customer) return;
  io.to(customerRoom(customer._id)).emit('customer-update', publicCustomer(customer));
}

module.exports = {
  staffRoom,
  tableRoom,
  customerRoom,
  publicOrder,
  publicCustomer,
  emitOrder,
  emitToStaff,
  emitCustomerUpdate
};

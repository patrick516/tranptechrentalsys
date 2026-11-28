const customersService = require("../services/customers.service");

async function list(req, res, next) {
  try {
    const items = await customersService.listCustomers(req.query);
    return res.status(200).json({ data: items });
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    const customer = await customersService.createCustomer(
      req.body,
      req.user,
      req,
    );
    return res.status(201).json({ data: customer });
  } catch (err) {
    return next(err);
  }
}

async function detail(req, res, next) {
  try {
    const result = await customersService.getCustomerDetail(req.params.id);
    return res.status(200).json({ data: result });
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const customer = await customersService.updateCustomer(
      req.params.id,
      req.body,
      req.user,
      req,
    );
    return res.status(200).json({ data: customer });
  } catch (err) {
    return next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const customer = await customersService.setCustomerStatus(
      req.params.id,
      req.body,
      req.user,
      req,
    );
    return res.status(200).json({ data: customer });
  } catch (err) {
    return next(err);
  }
}

async function createContact(req, res, next) {
  try {
    const customer = await customersService.addContact(
      req.params.id,
      req.body,
      req.user,
      req,
    );
    return res.status(201).json({ data: customer });
  } catch (err) {
    return next(err);
  }
}

async function updateContact(req, res, next) {
  try {
    const customer = await customersService.updateContact(
      req.params.id,
      req.params.contactId,
      req.body,
      req.user,
      req,
    );
    return res.status(200).json({ data: customer });
  } catch (err) {
    return next(err);
  }
}

async function removeContact(req, res, next) {
  try {
    const customer = await customersService.removeContact(
      req.params.id,
      req.params.contactId,
      req.user,
      req,
    );
    return res.status(200).json({ data: customer });
  } catch (err) {
    return next(err);
  }
}

async function archive(req, res, next) {
  try {
    const customer = await customersService.archiveCustomer(
      req.params.id,
      req.user,
      req,
    );
    return res.status(200).json({ data: customer });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  list,
  create,
  detail,
  update,
  updateStatus,
  createContact,
  updateContact,
  removeContact,
  archive,
};

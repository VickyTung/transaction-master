const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    trans_id: String,
    user_id: String,
    name: String,
    amount: Number,
    date: Date
});

const Transaction = mongoose.model('Transaction', TransactionSchema);

const RecurringTransaction = mongoose.model('RecurringTransaction', {
    name: String,
    user_id: String,
    next_amt: Number,
    next_date: Date,
    transactions: [TransactionSchema]
});

module.exports = {Transaction, RecurringTransaction};
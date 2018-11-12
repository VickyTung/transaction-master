const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const utils = require('./utils');
const {Transaction, RecurringTransaction} = require('./models');

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));
// parse application/json
app.use(bodyParser.json());

mongoose.connect('mongodb://localhost:27017/interview_challenge');

app.get('/', async (req, res) => {
    res.send(await RecurringTransaction.find({}));
});

app.post('/', async (req, res) => {
    const transactions = req.body;

    // upsert transactions
    console.log("start upserting transactions...");
    await Promise.all(transactions.map(async (transaction) => { 
        const { trans_id } = transaction;
        try {
            await Transaction.findOneAndUpdate({trans_id}, transaction, {upsert: true});
        } catch (err) {
            console.log(err);
            return res.status(500).send(err);
        }
    }));

    console.log("start refreshing recurring transactions...");
    // todo: paginations if too many rows
    let allTransactions;
    try {
        allTransactions = await Transaction.find({});
    } catch (err) {
        console.log(err);
        return res.status(500).send(err);
    }
    console.log("finished retrieving all transactions...");

    const groupedTransactions = utils.groupTransactions(allTransactions);
    console.log("finished grouping all transactions...");

    const allRecurringTransactions = utils.getAllRecurringTransactions(groupedTransactions);
    console.log("finished extracting all recurring transactions...");

    try {
        await RecurringTransaction.deleteMany({});
        await RecurringTransaction.insertMany(allRecurringTransactions);
    } catch (err) {
        console.log(err);
        return res.status(500).send(err);
    }

    res.send(allRecurringTransactions); 
});

const port = 1984;
const server = app.listen(port, () => console.log(`Example app listening on port ${port}!`));
// 10 sec
server.timeout = 10000;
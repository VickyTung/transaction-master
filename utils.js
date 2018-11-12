const models = require('./models');
const {Transaction, RecurringTransaction} = models; 

// todo: support more types of intervals
const INTERVAL_ONE_WEEK = 7*24*60*60*1000;
const INTERVAL_TWO_WEEK = 14*24*60*60*1000;
const INTERVAL_ONE_MONTH = 30*24*60*60*1000;

const INTERVALS = [
    INTERVAL_ONE_WEEK,
    INTERVAL_TWO_WEEK,
    INTERVAL_ONE_MONTH
];

const AMOUNT_BUFFER = 0.2;
const DATE_BUFFER = 0.1;

const getCompany = (name) => {
    const lastSpaceIdx = name.lastIndexOf(' ');
    if (lastSpaceIdx >= 0) {
        const suffix = name.substring(name.lastIndexOf(' ')+1);
        // check if suffix has number 
        // to determine whether it is referrence number
        if (/\d/.test(suffix)) {
            name = name.substring(0, lastSpaceIdx);
        }
    }
    return name;
}

const groupTransactions = (transactions) => {
    let groupedTransactions = {};
    transactions.forEach(transaction => {
        const { name, user_id } = transaction;
        const company = getCompany(name);
        const key = company + '_' + user_id;

        if (!groupedTransactions[key]) {
            groupedTransactions[key] = [];   
        } 
        groupedTransactions[key].push(transaction);
    });
    return groupedTransactions;
}

const getAllRecurringTransactions = (groupedTransactions) => {
    let recurringTransactions = [];

    // loop all groups
    Object.keys(groupedTransactions).forEach((key) => {
        let transactions = groupedTransactions[key];
        recurringTransactions = recurringTransactions.concat(getRecurringTransactions(transactions));
    });

    // sort by alphabetical order of name
    recurringTransactions.sort((a, b) => {
        return a.name > b.name;
    });

    return recurringTransactions;
}

const getRecurringForInterval = (interval, transaction, transactions) => {
    let recurringsForInterval = [transaction];

    while (true) {
        const recurrings = transactions.filter(t => {
            return (t.date - transaction.date >= interval * (1 - DATE_BUFFER) && t.date - transaction.date <= interval * ((1 + DATE_BUFFER))) 
        });
        if (recurrings.length == 0) {
            break;
        }
        transaction = recurrings[0];
        recurringsForInterval.push(transaction);
    }
    
    // recurrings have at least three transactions
    if (recurringsForInterval.length >= 3) {
        // sort by most recent first
        recurringsForInterval.sort((a, b) => {
            return a.date < b.date;
        });
        const recurring = recurringsForInterval[0];
        
        return new RecurringTransaction({
            name: recurring.name,
            user_id: recurring.user_id,
            next_amt: recurring.amount,
            next_date: new Date(Date.parse(recurring.date) + interval),
            transactions: recurringsForInterval
        });
    } else {
        return null;
    }
}

const getRecurringTransactions = (transactions) => {
    let recurringTransactions = [];
    if (transactions.length < 3) {
        return recurringTransactions;
    }

    // oldest transactions first to pick base transaction first
    transactions.sort((a, b) => {
        return a.date > b.date;
    });

    // marked recurring trans_id 
    let recurringIds = [];
    transactions.forEach(transaction => {
        // check if already marked as recurring
        if (recurringIds.indexOf(transaction.trans_id) >= 0) {
            return;
        }

        const transactionsWithSimilarAmount = transactions.filter(t => {
            return transaction.trans_id != t.trans_id && Math.abs(t.amount) >= (Math.abs(transaction.amount) * (1 - AMOUNT_BUFFER)) 
            && Math.abs(t.amount) <= (Math.abs(transaction.amount) * ((1 + AMOUNT_BUFFER)));
        });

        // prune if less than two candidates
        if (transactionsWithSimilarAmount.length < 2) {
            return;
        }

        let recurring;
        let foundRecurring = false;
        INTERVALS.forEach(interval => {
            // if recurring found, skip checking remaining intervals
            if (foundRecurring) {
                return;
            }
            recurring = getRecurringForInterval(interval, transaction, transactionsWithSimilarAmount);
            if (recurring) {
                recurringTransactions.push(recurring);
                recurringIds = recurringIds.concat(recurring.transactions.map(t => {
                    return t.trans_id;
                }));
                foundRecurring = true;
                return;
            }    
        });
    });

    return recurringTransactions;
}

module.exports = { groupTransactions, getAllRecurringTransactions}
function parseSainsburysPage()
{
    var currentBalanceNode = document.querySelector("dd.current");
    var currentBalanceText = currentBalanceNode.textContent.trim();
    var currentBalance = parseFloat(currentBalanceText.replace('£','').replace(',',''));

    var availableBalanceNode = document.querySelector("dd.available");
    var availableBalanceText = availableBalanceNode.textContent.trim();
    var availableBalance = parseFloat(availableBalanceText.replace('£','').replace(',',''));
                                       
    var transactions = []
    
    //var transactionNodes = document.querySelectorAll("tr[data-transaction-id]");
    var transactionNodes = document.querySelectorAll("tr.no-transaction-details");
    
    nextBalance = currentBalance;
    
    transactionNodes.forEach(
        function(currentValue, currentIndex, listObj) { 
            var dateNode = currentValue.querySelector("td[data-coltype='date']");
            var descriptionNode = currentValue.querySelector("td[data-coltype='description']");
            var amountNode = currentValue.querySelector("td[data-coltype='amount']");
            
            var transaction = {}
            
            var dateText = dateNode.textContent.trim();
            var date = new Date(dateText);
            
            var amountText = amountNode.textContent.trim();
            var amountIsCredit = false;
            if (amountText[0] === '+'){
                amountIsCredit = true;
            }
            amountText = amountText.replace('+','').replace('£','').replace(',','').trim();
            amount = parseFloat(amountText);
            
            transaction['date'] = date.toDateString();
            transaction['description'] = descriptionNode.textContent.trim();
            transaction['amount'] = amount;
            transaction['isCredit'] = amountIsCredit;
            transaction['balance'] = nextBalance;
            
            if (amountIsCredit){
                nextBalance += amount;
            } else {
                nextBalance -= amount;
            }
            
            console.log(transaction);
            
            transactions.push(transaction);
        },
    );
        
    return [currentBalance, availableBalance, transactions];
}

function formatCSV(balance, available, transactions){

    csv = "";
    
    csv = '"Account Name:","SAINSBURYS BANK PL"\n';
    csv +='"Account Balance:","' + balance + '"\n';
    csv +='"Available Balance: ","' + available + '"\n';
    csv +='\n';
    csv +='"Date","Transaction type","Description","Paid out","Paid in","Balance"\n';
    
    transactions.forEach(
        function(transaction, index){
            var transLine = "";
            transLine += '"' + transaction["date"] + '",';
            transLine += '"",'; //transaction type
            desc = transaction["description"].replace('"','').replace(',','');
            transLine += '"' + desc + '",';
            if (transaction['isCredit']){
                transLine += '"","' + transaction['amount'] + '",';
            } else {
                transLine += '"' + transaction['amount'] + '","",';
            }
            transLine += '"' + (transaction['balance'] * -1.0) + '"';
            csv += transLine + "\n";
        }    
    );
    
    return csv;
}

var saveData = (function () {
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    return function (data) {
        var fileName = "sainsburys-" + Date.now() + ".csv";
        var blob = new Blob([data], {type: "text/csv"});
        var url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
    };
}());

var values = parseSainsburysPage();
var csv = formatCSV(values[0], values[1], values[2]);
saveData(csv);


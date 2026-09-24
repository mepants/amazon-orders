function parseAmazonPage()
{
    var orders = [];

    var orderNodes = document.querySelectorAll('div.order-card');
    
    orderNodes.forEach(
        function(currentValue, currentIndex, listObj) { 
            
            order = {};
            orderNumber = "";
            
            newStyleOrderAmountNodes = currentValue.querySelectorAll('div.yohtmlc-order-total');
            
            if (!newStyleOrderAmountNodes || newStyleOrderAmountNodes.length == 0)
            {
                //Old style - deprecated
                orderDetailNodes = currentValue.querySelectorAll('span.a-color-secondary.value');
                if (!orderDetailNodes || orderDetailNodes.length == 0){
                    orderDetailNodes = currentValue.querySelectorAll('span.a-size-base.a-color-secondary');
                    
                    orderNumberSectionNodes = currentValue.querySelectorAll('div.yohtmlc-order-id');
                    orderNumberNode = orderNumberSectionNodes[0].children[1];
                    orderNumber = orderNumberNode.textContent.trim();
                }
                else if (orderDetailNodes.length > 2) {
                    orderNumber = orderDetailNodes[2].textContent.trim();
                }

                if ( orderDetailNodes.length < 2){
                    //Insufficient details to get amount and date - maybe a cancellation?
                    return; //Return and move to the next iteration in forEach
                }

                
                dateText = orderDetailNodes[0].textContent.trim();
                orderDate = new Date(dateText);

                orderAmountText = orderDetailNodes[1].textContent.trim();
                orderAmount = parseFloat(orderAmountText.replace('£','').replace(',',''));
                //orderAmount = 0.0;

                //orderNumber = orderDetailNodes[1].textContent.trim();
                
                order['price'] = orderAmount;
                order['number'] = orderNumber;
                order['date'] = orderDate;
                order['items'] = [];
            }
            else
            {
                //New format
                dateNode = currentValue.querySelector('div.a-column.a-span3');
                dateText = dateNode.children[1].textContent.trim();
                orderDate = new Date(dateText);
                
                orderAmountNode = currentValue.querySelector('div.yohtmlc-order-total');
                if ( orderAmountNode.children.length > 0)
                {
                    //Digital content
                    orderAmountText = orderAmountNode.children[1].textContent.trim();
                }
                else
                {
                    //Physical content
                    orderAmountText = orderAmountNode.textContent.trim();
                }
                orderAmount = parseFloat(orderAmountText.replace('£','').replace(',',''));
                
                orderNumberSectionNodes = currentValue.querySelectorAll('div.yohtmlc-order-id');
                orderNumberNode = orderNumberSectionNodes[0].children[1];
                orderNumber = orderNumberNode.textContent.trim();

                order['price'] = orderAmount;
                order['number'] = orderNumber;
                order['date'] = orderDate;
                order['items'] = [];

            }

            shipmentBox = currentValue.querySelector('div.delivery-box');
            
            if (order['number'][0] === 'D' || shipmentBox == null){
                order['digital'] = true;

                infoBox = currentValue.querySelector('div.a-fixed-left-grid-col.a-col-right');

                descriptionNode = infoBox.querySelector('a.a-link-normal');
                descriptionText = 'Unknown Digital Item';
                if (descriptionNode && descriptionNode.textContent){
                    descriptionText = descriptionNode.textContent.trim();
                }

                item ={};
                item['price'] = orderAmount;
                item['description'] = descriptionText;
                order['items'].push(item);
            }
            else{
                order['digital'] = false;

                shipmentBoxes = currentValue.querySelectorAll('div.delivery-box');
                shipmentBoxes.forEach(
                    function(shipmentNode, shipmentIndex, shipmentList) {
                        infoNode = shipmentNode.querySelector('div.a-fixed-left-grid-col.a-col-right');
                        descriptionNode = infoNode.querySelector('a.a-link-normal');
                        descriptionText = descriptionNode.textContent.trim();

                        priceSpanNode = infoNode.querySelector('span.a-size-small.a-color-price');
                        if (priceSpanNode){
                            priceNode = priceSpanNode.querySelector('nobr');
                            if (priceNode){
                                priceText = priceNode.textContent.trim();
                                itemPrice = parseFloat(priceText.replace('£','').replace(',',''));
                            }
                            else{
                                itemPrice = order['price']
                            }
                        }
                        else{
                            itemPrice = order['price']
                        }

                        item ={};
                        item['price'] = itemPrice;
                        item['description'] = descriptionText;
                        order['items'].push(item);
                    }
                );
            }

            orders.push(order);
        }
    );    
    
    return orders;
}

var saveData = (function () {
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    return function (data) {
        var fileName = "amazon-" + Date.now() + ".json";
        dataJson = JSON.stringify(data)
        var blob = new Blob([dataJson], {type: "application/json"});
        var url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
    };
}());

orders = parseAmazonPage();
saveData(orders);
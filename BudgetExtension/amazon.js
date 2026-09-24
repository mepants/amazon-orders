function parseAmazonPage() {
    const orders = [];
    const seenOrderNumbers = new Set();

    // Select order card containers (handles old, intermediate, and modern classes/attributes)
    const orderNodes = document.querySelectorAll(
        'div.order-card, div.js-order-card, div[data-csa-c-content-id="amzn1.yourorders.order-card"], div.your-orders-box-styling'
    );

    orderNodes.forEach((cardNode) => {
        try {
            // 1. EXTRACT ORDER NUMBER
            let orderNumber = '';

            // 1a. From data-csa-c-slot-id attribute (e.g. "amzn1.yourorders.order-card.202-6260928-4689935")
            const slotId = cardNode.getAttribute('data-csa-c-slot-id') || 
                           cardNode.closest('[data-csa-c-slot-id]')?.getAttribute('data-csa-c-slot-id') || '';
            const slotMatch = slotId.match(/(?:order-card\.)([0-9]{3}-[0-9]{7}-[0-9]{7}|D[0-9]{2}-[0-9]{7}-[0-9]{7})/i);
            if (slotMatch) {
                orderNumber = slotMatch[1];
            }

            // 1b. From yohtmlc-order-id or order-id classes
            if (!orderNumber) {
                const orderIdSection = cardNode.querySelector('div.yohtmlc-order-id, [class*="order-id"]');
                if (orderIdSection) {
                    const idMatch = orderIdSection.textContent.match(/([0-9]{3}-[0-9]{7}-[0-9]{7}|D[0-9]{2}-[0-9]{7}-[0-9]{7})/i);
                    if (idMatch) {
                        orderNumber = idMatch[1];
                    } else if (orderIdSection.children.length > 1) {
                        orderNumber = orderIdSection.children[1].textContent.trim();
                    }
                }
            }

            // 1c. From links containing orderId param
            if (!orderNumber) {
                const orderLink = cardNode.querySelector('a[href*="orderId="], a[href*="orderID="]');
                if (orderLink) {
                    const linkMatch = orderLink.href.match(/orderID=([0-9]{3}-[0-9]{7}-[0-9]{7}|D[0-9]{2}-[0-9]{7}-[0-9]{7})/i);
                    if (linkMatch) orderNumber = linkMatch[1];
                }
            }

            // 1d. Fallback: search raw header text
            if (!orderNumber) {
                const rawMatch = cardNode.textContent.match(/\b([0-9]{3}-[0-9]{7}-[0-9]{7}|D[0-9]{2}-[0-9]{7}-[0-9]{7})\b/i);
                if (rawMatch) orderNumber = rawMatch[1];
            }

            // Avoid duplicate processing of the same order card
            if (orderNumber && seenOrderNumbers.has(orderNumber)) {
                return;
            }
            if (orderNumber) {
                seenOrderNumbers.add(orderNumber);
            }

            // 2. EXTRACT ORDER DATE
            let orderDate = null;
            
            // 2a. Check date column (new format: div.a-column.a-span3 or columns with date label)
            const dateColumns = cardNode.querySelectorAll('div.a-column.a-span3, div.a-column, [class*="order-date"], [class*="order-placed"]');
            for (const col of dateColumns) {
                const text = col.textContent;
                if (/ORDER PLACED|Order placed|Placed on|Date/i.test(text) || col.querySelector('span.a-color-secondary')) {
                    const valNode = col.querySelector('.value, span:not(.a-color-secondary):not(.a-text-bold)');
                    const candidateText = valNode ? valNode.textContent.trim() : (col.children[1]?.textContent.trim() || text.trim());
                    const parsed = new Date(candidateText);
                    if (!isNaN(parsed.getTime())) {
                        orderDate = parsed;
                        break;
                    }
                }
            }

            // 2b. Check secondary value spans (old format)
            if (!orderDate) {
                const secondarySpans = cardNode.querySelectorAll('span.a-color-secondary.value, span.a-size-base.a-color-secondary');
                for (const span of secondarySpans) {
                    const candidateText = span.textContent.trim();
                    const parsed = new Date(candidateText);
                    if (!isNaN(parsed.getTime())) {
                        orderDate = parsed;
                        break;
                    }
                }
            }

            // 2c. Regex match on card header text for standard dates
            if (!orderDate) {
                const dateRegex = /\b(\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4})\b/i;
                const headerArea = cardNode.querySelector('.order-header, .a-box-group, .a-box') || cardNode;
                const match = headerArea.textContent.match(dateRegex);
                if (match) {
                    const parsed = new Date(match[1]);
                    if (!isNaN(parsed.getTime())) orderDate = parsed;
                }
            }

            if (!orderDate) {
                orderDate = new Date();
            }

            // 3. EXTRACT ORDER TOTAL PRICE
            let orderAmount = 0.0;
            
            // 3a. New style: yohtmlc-order-total
            const orderAmountNode = cardNode.querySelector('div.yohtmlc-order-total, [class*="order-total"]');
            if (orderAmountNode) {
                let amountText = '';
                if (orderAmountNode.children.length > 0) {
                    const val = orderAmountNode.querySelector('.value') || orderAmountNode.children[1] || orderAmountNode.children[0];
                    amountText = val?.textContent?.trim() || orderAmountNode.textContent.trim();
                } else {
                    amountText = orderAmountNode.textContent.trim();
                }
                const parsedAmount = parseFloat(amountText.replace(/[^0-9.]/g, ''));
                if (!isNaN(parsedAmount)) orderAmount = parsedAmount;
            }

            // 3b. Search for "TOTAL" / "Total" column
            if (orderAmount === 0.0) {
                const headerBoxes = cardNode.querySelectorAll('.order-header .a-column, .a-box-group .a-column, div.a-column');
                for (const col of headerBoxes) {
                    if (/TOTAL|Total|Grand Total/i.test(col.textContent)) {
                        const valNode = col.querySelector('.value, span:not(.a-color-secondary):not(.a-text-bold)');
                        const candidate = valNode ? valNode.textContent : col.textContent;
                        const parsed = parseFloat(candidate.replace(/[^0-9.]/g, ''));
                        if (!isNaN(parsed)) {
                            orderAmount = parsed;
                            break;
                        }
                    }
                }
            }

            // 3c. Old style fallback: second span.a-color-secondary.value
            if (orderAmount === 0.0) {
                const orderDetailNodes = cardNode.querySelectorAll('span.a-color-secondary.value');
                if (orderDetailNodes && orderDetailNodes.length >= 2) {
                    const parsed = parseFloat(orderDetailNodes[1].textContent.replace(/[^0-9.]/g, ''));
                    if (!isNaN(parsed)) orderAmount = parsed;
                }
            }

            // 3d. General currency regex match in header
            if (orderAmount === 0.0) {
                const headerArea = cardNode.querySelector('.order-header, .a-box-group > .a-box, .a-box') || cardNode;
                const priceMatch = headerArea.textContent.match(/(?:£|\$|€|EUR|GBP)\s*([\d,]+\.\d{2})/i);
                if (priceMatch) {
                    const parsed = parseFloat(priceMatch[1].replace(/,/g, ''));
                    if (!isNaN(parsed)) orderAmount = parsed;
                }
            }

            // 4. DETERMINE DIGITAL VS PHYSICAL
            const isDigitalNumber = typeof orderNumber === 'string' && orderNumber.startsWith('D');
            const hasDeliveryBox = cardNode.querySelector('div.delivery-box, div.shipment, [data-component="shipment"]') !== null;
            const digital = isDigitalNumber || (!hasDeliveryBox && /Kindle|Digital|Amazon Video|Prime Video|Audible|Appstore/i.test(cardNode.textContent));

            const order = {
                price: orderAmount,
                number: orderNumber,
                date: orderDate,
                items: [],
                digital: digital
            };

            // 5. EXTRACT ITEMS
            // Helper to clean and validate product titles
            const isValidTitle = (text) => {
                if (!text || text.length < 2) return false;
                const ignored = [
                    'Track package', 'Return items', 'Return or replace items', 'Write a product review',
                    'Buy it again', 'View order details', 'Invoice', 'Archive order', 'Ask Product Support',
                    'Leave seller feedback', 'Problem with order', 'Get help', 'View your item', 'Buy again',
                    'Share gift receipt', 'Leave delivery feedback', 'Track delivery'
                ];
                return !ignored.some(ig => ig.toLowerCase() === text.trim().toLowerCase());
            };

            const cleanDescription = (text) => {
                return text ? text.replace(/\s+/g, ' ').trim() : '';
            };

            if (digital) {
                // Digital items extraction
                let desc = '';
                const digitalLink = cardNode.querySelector(
                    'div.a-fixed-left-grid-col.a-col-right a.a-link-normal, .yohtmlc-item a.a-link-normal, a.a-link-normal[href*="/dp/"], a.a-link-normal[href*="/gp/product/"], a.a-link-normal[href*="/gp/video/"]'
                );
                if (digitalLink && isValidTitle(digitalLink.textContent)) {
                    desc = cleanDescription(digitalLink.textContent);
                }
                
                if (!desc) {
                    const img = cardNode.querySelector('img[alt]:not([alt=""])');
                    if (img && isValidTitle(img.getAttribute('alt'))) {
                        desc = cleanDescription(img.getAttribute('alt'));
                    }
                }

                if (!desc) desc = 'Unknown Digital Item';

                order.items.push({
                    price: orderAmount,
                    description: desc
                });
            } else {
                // Physical items extraction
                // Strategy A: Check shipment / delivery boxes
                const shipmentBoxes = cardNode.querySelectorAll('div.delivery-box, div.shipment, [data-component="shipment"]');
                
                if (shipmentBoxes && shipmentBoxes.length > 0) {
                    shipmentBoxes.forEach((shipmentNode) => {
                        // Look for all item containers / rows within this shipment box
                        const itemRows = shipmentNode.querySelectorAll('div.a-fixed-left-grid, div.yohtmlc-item, div.a-row');
                        const targets = itemRows.length > 0 ? Array.from(itemRows) : [shipmentNode];

                        targets.forEach((itemRow) => {
                            let descriptionText = '';
                            
                            // 1. Try product link
                            const linkNodes = itemRow.querySelectorAll('a.a-link-normal');
                            for (const link of linkNodes) {
                                const text = cleanDescription(link.textContent);
                                if (isValidTitle(text) && !text.startsWith('£') && !text.startsWith('$')) {
                                    descriptionText = text;
                                    break;
                                }
                            }

                            // 2. Try img alt
                            if (!descriptionText) {
                                const imgNode = itemRow.querySelector('img[alt]:not([alt=""])');
                                if (imgNode) {
                                    const alt = cleanDescription(imgNode.getAttribute('alt'));
                                    if (isValidTitle(alt)) descriptionText = alt;
                                }
                            }

                            if (descriptionText) {
                                // Extract item price if present
                                let itemPrice = orderAmount;
                                const priceSpan = itemRow.querySelector('span.a-size-small.a-color-price, span.a-color-price, .a-price .a-offscreen, .a-price span[aria-hidden="true"]');
                                if (priceSpan) {
                                    const priceMatch = priceSpan.textContent.match(/[\d,]+\.\d{2}/);
                                    if (priceMatch) {
                                        const parsed = parseFloat(priceMatch[0].replace(/,/g, ''));
                                        if (!isNaN(parsed) && parsed > 0) itemPrice = parsed;
                                    }
                                }

                                // Avoid exact duplicate item entries within same order
                                const alreadyAdded = order.items.some(i => i.description === descriptionText);
                                if (!alreadyAdded) {
                                    order.items.push({
                                        price: itemPrice,
                                        description: descriptionText
                                    });
                                }
                            }
                        });
                    });
                }

                // Strategy B: If no items found from shipment boxes, search product links in the whole card
                if (order.items.length === 0) {
                    const productLinks = cardNode.querySelectorAll('a.a-link-normal[href*="/dp/"], a.a-link-normal[href*="/gp/product/"], a.a-link-normal[href*="/gp/buyagain/"]');
                    productLinks.forEach((link) => {
                        const text = cleanDescription(link.textContent);
                        if (isValidTitle(text) && !order.items.some(i => i.description === text)) {
                            order.items.push({
                                price: orderAmount,
                                description: text
                            });
                        }
                    });
                }

                // Strategy C: If still no items found, check product images
                if (order.items.length === 0) {
                    const images = cardNode.querySelectorAll('img[alt]:not([alt=""])');
                    images.forEach((img) => {
                        const alt = cleanDescription(img.getAttribute('alt'));
                        if (isValidTitle(alt) && !order.items.some(i => i.description === alt)) {
                            order.items.push({
                                price: orderAmount,
                                description: alt
                            });
                        }
                    });
                }

                // Final Fallback: if somehow nothing could be extracted, add placeholder
                if (order.items.length === 0) {
                    order.items.push({
                        price: orderAmount,
                        description: 'Unknown Item'
                    });
                }
            }

            orders.push(order);
        } catch (err) {
            console.error('Error parsing order card:', err);
        }
    });

    return orders;
}

const saveData = (function () {
    const a = document.createElement("a");
    document.body.appendChild(a);
    a.style.display = "none";
    return function (data) {
        const fileName = "amazon-" + Date.now() + ".json";
        const dataJson = JSON.stringify(data);
        const blob = new Blob([dataJson], {type: "application/json"});
        const url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    };
}());

const orders = parseAmazonPage();
saveData(orders);
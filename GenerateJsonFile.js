const fs = require('fs');
const https = require('https');


//function to fetch item details from FakeStoreAPI
function FetchItemDetails(itemId){
    return new Promise((resolve, reject) => {
        https.get(`https://fakestoreapi.com/products/${itemId}`, (resp) => {
            let data = '';

            //each data has been received.
            resp.on('data', (chunk) => {
                data += chunk;
            });

            //The whole response has been received. Parse result to JSON
            resp.on('end', () => {
                resolve(JSON.parse(data));
            });
        }).on('error', (err) =>{
            console.log(`Error fetching item : ${itemId} with message: ${err.message}`);
            resolve(null);
        });
    });
}

function ParseCSV(data){
    const lines =  data.split("\n").filter(line => line.trim() !== '');
    const rows = lines.map(line => line.split(',').map(field => field.trim()));
    
    return rows;
}

//Read the CSV File
fs.readFile('Order Details.csv', 'utf8', async(err,data) => {
    if(err){
        console.error("Error reading CSV file", err);
        return;
    }

    const csvRows = ParseCSV(data);
    const orders = {};

    for(const row of csvRows){
        const lineType = row[0];

        if(lineType === "Header"){
            const orderNo  = row[1];
            orders[orderNo] = {
                order_number: orderNo,
                customer_name: row[2],
                delivery_postal: row[3],
                item_lines:[],
                total_price:0,
                unique_items:0
            };
        }
        else if(lineType === "Line"){
            const orderNo = row[1];
            const itemId = row[2];
            const quantity = parseInt(row[3],10);

            if(orders[orderNo]){
                //Fetch item details from API
                const itemDetails = await FetchItemDetails(itemId);
                
                if(itemDetails){
                    const price = itemDetails.price || 0;
                    const itemName = itemDetails.title;
                    const totalItemPrice = price * quantity;

                    orders[orderNo].item_lines.push({
                        item_id: itemId,
                        item_name: itemName,
                        price: price,
                        quantity: quantity,
                    });

                    //Update order total price and unique item count
                    orders[orderNo].total_price += totalItemPrice;
                    orders[orderNo].unique_items += 1;
                }
            }
        }
    }
    //Generate JSON order file
    for (const [orderNo, orderDetails] of Object.entries(orders)){
        const fileName = `order${orderNo}.json`;
        fs.writeFileSync(fileName, JSON.stringify(orderDetails, null, 4));
    }

    console.log("Order JSON file have been generated successfully.");
});


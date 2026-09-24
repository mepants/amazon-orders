
function displayCSV(csv_data)
{
    prompt("Ctrl-C to copy, then Import Amazon on spreadsheet:", csv_data)
    return
 }



function parseAmazonPage()
{
 
  session_num = ""

  session_re = /.*unsticky\/([A-Z0-9][0-9]{2}-[0-9]{7}-[0-9]{7}).*/i
  ordernum_re = /.*([A-Z0-9][0-9]{2}-[0-9]{7}-[0-9]{7}).*/i
  date_re = /.*?([0-9][0-9]? (January|February|March|April|May|June|July|August|September|October|November|December) 20[0-9]{2}).*/i
  price_re = /.*(£[0-9]*\.[0-9]{2}).*/i
  desc_re = /.*title="(.*?)" data-a-hires=.*/i
  desc_multiline_re = /.*class="a-link-normal" href="\/gp\/product\/.*/i
  qty_re =/.*span class="item-view-qty".*/i
   

  current_order_date = ""
  current_order_num = ""
  current_order_price = ""
  current_desc = ""
  current_item_price = ""
  current_qty =1

  src = document.getElementsByTagName('html')[0].innerHTML;
  //parent.document.getElementsByTagName('html')[0].innerHTML;
  //alert(src)
  lines = src.split('\n');
           
  var output = ""     

  for (linenum=0; linenum<lines.length; linenum++)
  {
    line = lines[linenum]
    nextline = lines[linenum+1]

    if (line.indexOf("a-pagination") != -1)
    {
      break
    }

    if (line.indexOf("-") != -1)
    {
      result = ordernum_re.exec(line)
      if (result)
      {
        if (session_num == "")
        {
          session_result = session_re.exec(line)
          if (session_result)
          {
            session_num = session_result[1]
            console.log("Session: " + session_num)
          }
        }

        if (result[1] != session_num)
        {
          current_order_num = result[1]
          console.log("Order: " + current_order_num)
        }
      }
    }

    if (line.indexOf("20") != -1)
    {
      result = date_re.exec(line)
      if (result)
      {
          //This marks the start of a new order
          current_order_date = result[1]
          current_order_num = ""
          current_order_price = ""
          current_desc = ""
          current_item_price = ""
          current_qty=1

          console.log("Date:" + current_order_date)
      }
    }
      
    if (line.indexOf("item-view-qty") != -1)
    {
        result = qty_re.exec(line)
        if (result)
        {
            qty = parseInt(nextline.trim())
            if (qty>0)
            {
                console.log("Quantity: " + qty)
                current_qty = qty
            }
        }
    }

    if (line.indexOf("£") != -1)
    {
      result = price_re.exec(line)
      if (result)
      {
        if (current_order_price == "")
        {
          current_order_price = result[1]
          console.log("Order Price: " + current_order_price)
        }
        else
        {
          current_item_price = result[1]
          console.log("Item Price: " + current_item_price)
          
          if (current_desc != "")
          {
              item_price_float = parseFloat(current_item_price.replace("£",""))
              item_price_total= item_price_float * current_qty

              output += "Physical Item," + current_order_date + "," + current_order_num + "," + current_order_price + ",£" + item_price_total + "," + current_desc + '\\'
              
              //Reset item details
              current_qty = 1
              current_item_price = ""
              current_desc = ""
          }
        }
      }
    }

    if (line.indexOf("/gp/product") != -1)
    {
      result = desc_multiline_re.exec(line)
      if (result)
      {
        if (nextline.trim() != "" && nextline.indexOf("<img")==-1)
        {
            current_desc = nextline.trim()
            current_desc = current_desc.replace(/,/g,"")
            current_desc = current_desc.replace("\\","")
            if (current_desc.length > 80)
            {
                current_desc = current_desc.substring(0, 50)
            }
            console.log("Desc(ml): " + current_desc)
        }
      }
    }
      
    if (line.indexOf("img") != -1)
    {
      result = desc_re.exec(line)
      if (result)
      {
        current_desc = result[1]
        console.log("Desc: " + current_desc)
        current_desc = current_desc.replace(/,/g,"")
        current_desc = current_desc.replace("\\","")
        if (current_order_num[0] == "D")
        {
          output += "Digital Item," + current_order_date + "," + current_order_num + "," + current_order_price + "," + current_item_price + "," + current_desc + '\\'
        }
      }
    }
      

  }//for loop

  displayCSV(output);
}

parseAmazonPage()


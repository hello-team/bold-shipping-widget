import React, { useState, useEffect } from "react";
import TextField from '@material-ui/core/TextField';
import AdapterDateFns from '@material-ui/lab/AdapterDateFns';
import LocalizationProvider from '@material-ui/lab/LocalizationProvider';
import DatePicker from '@material-ui/lab/DatePicker';
import SHQRates from './ShipperHq'
import { Radio, Form, FormGroup, Textarea, Button, GlobalStyles } from '@bigcommerce/big-design';
import * as _ from 'underscore';

export default function BasicDatePicker(props) {
  const [value, setValue] = useState();
  const [payloadData, setPayload] = useState(null)
  const [cart, setCart] = useState(null)
  const [destination, setDestination] = useState(null)
  const [rates, setRates] = useState(null)
  const [comments, setComments] = useState();

  const handleComments = (event) => setComments(event.target.value);


  window.addEventListener('message', function (event) {

    let message = event.data;
    console.log({ widget: message.type })
    console.log(message.type, message.payload)
    let payload = message.payload
    let address = payload.shipping_address
    let prods = payload.line_items
    if (!destination && address.postal_code && prods.length !== 0) {

      console.log('Received order data', payload);
      console.log({ shipping_address: address })

      setPayload(message.payload)

      let items = prods.map(x => {
        let item = {
          "itemId": x.platform_variant_id,
          "weight": 1,
          "qty": 1,
          "type": "SIMPLE"
        }
        return item
      })


      setDestination({ "zipcode": address.postal_code, "country": address.country_code })
      setCart(items)
      let shq = new SHQRates()
      console.log({ "zipcode": address.postal_code, "country": address.country_code }, items, null)
      Promise.resolve(shq.getRates({ "zipcode": address.postal_code, "country": address.country_code }, items, null)).then(data => {
        console.log({ shqrates: data })
        setValue(data.avail_dates[0])
        setRates(data)

        let shipingRate = {
          "type": "SET_SHIPPING_RATE",
          "data": {
            "shipping_rate": {
              "price": 1000,
              "name": `${data.line_text}: ${new Date(data.avail_dates[0]).toLocaleDateString()}`,
              "code": `${data.line_text}: ${new Date(data.avail_dates[0]).toLocaleDateString()}`
            }
          }
        }
        window.parent.postMessage({
          type: 'checkout/app_hook',
          payload: {
            hook: 'shipping_rates',
            data: shipingRate
          }
        }, '*');
      })
    }
  });



  const handleFinishComments = (event) => {
    console.log(event, comments)
    let note = {
      "type": "ADD_NOTE_ATTRIBUTE",
      "data": {
        "name": "order_notes",
        "value": comments
      }
    }
    window.parent.postMessage({
      type: 'checkout/app_hook',
      payload: {
        hook: 'order_notes',
        data: note
      }
    }, '*');
  }



  const handleNewDate = (newValue) => {
    setValue(new Date(newValue).toLocaleDateString());
    let shipingRate = {
      "type": "SET_SHIPPING_RATE",
      "data": {
        "shipping_rate": {
          "price": 1000,
          "name": `${rates.line_text}: ${new Date(newValue).toLocaleDateString()}`,
          "code": `${rates.line_text}: ${new Date(newValue).toLocaleDateString()}`
        }
      }
    }

    window.parent.postMessage({
      type: 'checkout/app_hook',
      payload: {
        hook: 'shipping_rates',
        data: shipingRate
      }
    }, '*');
  }



  return (
    <div style={{ display: 'flex' }}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Form>
          <FormGroup>
            <Radio
              label={rates ? rates.line_text : ''}
              description={value ? `Delivery Date: ${value}` : ''}
              checked={true}
              value={rates ? {
                "type": "SET_SHIPPING_RATE",
                "data": {
                  "shipping_rate": {
                    "price": 1000,
                    "name": `${rates.line_text}: ${rates.delivery_date}`,
                    "code": `${rates.line_text}: ${rates.delivery_date}`
                  }
                }
              } : ''}
              onChange={() => { }}
            />
            <DatePicker
              orientation="landscape"
              openTo="day"
              value={value}
              minDate={rates ? new Date(rates.avail_dates[0]) : new Date()}
              maxDate={rates ? new Date(rates.avail_dates[rates.avail_dates.length - 1]) : new Date()}
              onChange={(newValue) => {
                handleNewDate(newValue);
              }}
              renderInput={(params) => <TextField {...params} />}
            />
          </FormGroup>
          <FormGroup>
            <Textarea
              id="my-input-box"
              label="Please add any comments for your order"
              description=""
              placeholder="Placeholder"
              rows={3}
              resize={true}
              value={comments}
              onChange={handleComments}
              onBlur={(e) => handleFinishComments('my-input-box')}
            />
          </FormGroup>
        </Form>
      </LocalizationProvider>
    </div>

  )
}
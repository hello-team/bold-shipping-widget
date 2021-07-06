import axios from "axios";
import dotenv from 'dotenv'
dotenv.config()

export default class SHQRates {
    constructor() {

    }

    async graphVars(shipping, items, selectedDate) {
        let requestedOptions = selectedDate != null ? {
            "selectedDate": new Date(selectedDate).toLocaleDateString()
          } : null
          console.log(requestedOptions)

       let data = {
        "ratingInfo": {
          "cart": {
            "items": items,
            "declaredValue": 0
          },
          "destination": shipping,
          "customer": {
            "customerGroup": "NOT LOGGED IN"
          },
          "cartType": "STD",
          "requestedOptions": requestedOptions,
          "siteDetails": {
            "appVersion": "1.0.0",
            "ecommerceCart": "Bold Commerce",
            "ecommerceVersion": "2.3.1",
            "websiteUrl": "http://www.example.com",
            "ipAddress": "12.34.567"
          }
        }
      }
      return data
    }

    async getRates(shipping, items, deliveryDate) {
      let graphVariables = await this.graphVars(shipping, items, deliveryDate)
      console.log({ requestedOptions: graphVariables})
        try {
            let bodyData = JSON.stringify({
                query: `query RetrieveFullShippingQuote($ratingInfo: RatingInfoInput!) {
              retrieveFullShippingQuote(ratingInfo: $ratingInfo) {
                transactionId
                validationStatus
                shipments {
                  shipmentDetail {
                    name
                    shipmentId
                  }
                  carriers {
                    carrierDetail {
                      carrierCode
                      carrierTitle
                      carrierType
                    }
                    methods {
                      methodDetails {
                        methodCode
                        methodTitle
                        totalCharges
                      },
                      timeInTransitOptions {
                        deliveryDate
                        dispatchDate
                      }
                    }
                    calendarDate {
                      availableDeliveryDates
                    }
                    dateFormat
                    error {
                      errorCode
                      internalErrorMessage
                      externalErrorMessage
                      priority
                    }
                  }
                  groupedItems {
                    itemId
                  }
                }
                errors {
                  errorCode
                  internalErrorMessage
                  externalErrorMessage
                  priority
                }
              }
            }`,
                variables: graphVariables
            });
    
            let config = {
                method: 'post',
                url: 'https://api.shipperhq.com/v2/graphql',
                headers: {
                    'Content-Type': 'application/json',
                    'X-ShipperHQ-Access-Token': process.env.REACT_APP_SHQ_ACCESS_TOKEN,
                    'X-ShipperHQ-Session': 'BOLD',
                    'X-ShipperHQ-Scope': 'INTEGRATION'
                },
                data: bodyData
            };
    
            let {data} = await axios(config)

            console.log(data.data.retrieveFullShippingQuote.shipments[0].carriers[0])
    
            let rates = data.data.retrieveFullShippingQuote.shipments[0].carriers[0].methods.map(rate => {
              console.log({transactionId: data.data.retrieveFullShippingQuote.transactionId, rate: `${rate.methodDetails.methodTitle} (Estimated Delivery: ${rate.timeInTransitOptions.deliveryDate})`})
                return {
                    line_text: rate.methodDetails.methodTitle,
                    delivery_date: rate.timeInTransitOptions.deliveryDate,
                    value: rate.methodDetails.totalCharges,
                    avail_dates: data.data.retrieveFullShippingQuote.shipments[0].carriers[0].calendarDate.availableDeliveryDates
                }
            })

    
            return rates[0]
        } catch (error) {
            console.log(error)
        }
      
    }
}



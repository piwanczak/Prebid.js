import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { EVENTS } from '../src/constants.js';
import { ajax } from '../src/ajax.js';

const {
  AUCTION_INIT,
  AUCTION_END,
  BID_WON,
  BID_TIMEOUT,
  BIDDER_ERROR,
  BID_REJECTED,
  BID_REQUESTED,
  AD_RENDER_FAILED,
  AD_RENDER_SUCCEEDED,
  AUCTION_TIMEOUT
} = EVENTS;

const URL = 'https://tracker.creativecdn.com/prebid-analytics';
const ANALYTICS_TYPE = 'endpoint';
const BIDDER_CODE = 'rtbhouse';
const GVLID = 16;

let rtbhParams = {};

let rtbhouseAnalyticsAdapter = Object.assign({},
  adapter({
    url: URL,
    analyticsType: ANALYTICS_TYPE,
  }),
  {
    track({ eventType, args }) {
      switch (eventType) {
        case AUCTION_INIT:
        case AUCTION_TIMEOUT:
        case AUCTION_END:
          auctionHandler(eventType, args);
          break;
        case BID_REQUESTED:
          if (args.bidderCode === BIDDER_CODE) {
            for (const bid of args.bids) {
              const bidParams = bid.params?.length ? bid.params[0] : bid.params;
              rtbhParams[bid.bidId] = bidParams;
            }
          };
          break;
        case BID_WON:
        case BID_TIMEOUT:
        case BID_REJECTED:
          bidHandler(eventType, args);
          break;
        case BIDDER_ERROR:
          onBidderError(args);
          break;
        case AD_RENDER_FAILED:
        case AD_RENDER_SUCCEEDED:
          onAdRender(eventType, args);
          break;
        default:
          break;
      }
    }
  }
);

const sendDataToServer = (data) => {
  // make sure no-cors is set/not needed
  ajax(URL, function () {}, JSON.stringify(data), {contentType: 'text/plain'});
}

const auctionHandler = (eventType, data) => {
  const auctionData = {
    auctionId: data.auctionId,
    status: eventType,
    timeout: data.timeout,
    metrics: data.metrics,
    bidderRequests: data.bidderRequests?.map(bidderRequest => {
      delete bidderRequest.gdprConsent;
      delete bidderRequest.refererInfo;
      return bidderRequest;
    }).filter(request => request.bidderCode === BIDDER_CODE),
  }

  sendDataToServer({ eventType, auctionData });
}

const bidHandler = (eventType, bid) => {
  let bids = bid.length ? bid : [ bid ];

  for (const bidObj of bids) {
    let bidToSend;

    if (bidObj.bidderCode != BIDDER_CODE) {
      if (eventType === BID_WON) {
        bidToSend = {
          cpm: bidObj.cpm,
          auctionId: bidObj.auctionId
        };
      } else continue;
    }

    bidToSend = bidObj;

    if (eventType === BID_REJECTED) {
      bidToSend.params = rtbhParams[bid.requestId];
    }

    sendDataToServer({ eventType, bid: bidToSend });
  }
}

const onBidderError = (data) => {
  sendDataToServer({
    eventType: BIDDER_ERROR,
    error: data.error,
    bidderRequests: data?.bidderRequests?.length
      ? data.bidderRequests.filter(request => request.bidderCode === BIDDER_CODE)
      : [ data.bidderRequest ]
  });
}

const onAdRender = (eventType, data) => {
  if (data?.bid?.bidderCode === BIDDER_CODE) {
    sendDataToServer({ eventType, renderData: data });
  }
}

adapterManager.registerAnalyticsAdapter({
  adapter: rtbhouseAnalyticsAdapter,
  code: BIDDER_CODE,
  gvlid: GVLID
})

export default rtbhouseAnalyticsAdapter;

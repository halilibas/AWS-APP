{
    "Comment": "Bidding Step Function - With Existence Checks",
    "StartAt": "GetUser",
    "States": {
      "GetUser": {
        "Type": "Task",
        "Resource": "arn:aws:states:::dynamodb:getItem",
        "Parameters": {
          "TableName": "Users",
          "Key": {
            "userId": {
              "S.$": "$.userId"
            }
          }
        },
        "ResultPath": "$.user",
        "Next": "IsUserValid"
      },
      "IsUserValid": {
        "Type": "Choice",
        "Choices": [
          {
            "Variable": "$.user.Item",
            "IsPresent": false,
            "Next": "UserNotFound"
          }
        ],
        "Default": "ExtractBalance"
      },
      "UserNotFound": {
        "Type": "Fail",
        "Cause": "User does not exist"
      },
      "ExtractBalance": {
        "Type": "Pass",
        "Parameters": {
          "acctBalance.$": "States.StringToJson($.user.Item.acctBalance.N)"
        },
        "ResultPath": "$.userBalance",
        "Next": "GetAuction"
      },
      "GetAuction": {
        "Type": "Task",
        "Resource": "arn:aws:states:::dynamodb:getItem",
        "Parameters": {
          "TableName": "Auctions",
          "Key": {
            "auctionId": {
              "S.$": "$.auctionId"
            }
          }
        },
        "ResultPath": "$.auction",
        "Next": "IsAuctionPresent"
      },
      "IsAuctionPresent": {
        "Type": "Choice",
        "Choices": [
          {
            "Variable": "$.auction.Item",
            "IsPresent": false,
            "Next": "AuctionNotFound"
          }
        ],
        "Default": "IsAuctionValid"
      },
      "AuctionNotFound": {
        "Type": "Fail",
        "Cause": "Auction doesn't exist"
      },
      "IsAuctionValid": {
        "Type": "Choice",
        "Choices": [
          {
            "Variable": "$.auction.Item.status.S",
            "StringEquals": "closed",
            "Next": "AuctionClosed"
          }
        ],
        "Default": "QueryHighestBid"
      },
      "AuctionClosed": {
        "Type": "Fail",
        "Cause": "Auction is already cloded."
      },
      "QueryHighestBid": {
        "Type": "Task",
        "Resource": "arn:aws:states:::aws-sdk:dynamodb:query",
        "Parameters": {
          "TableName": "Bids",
          "IndexName": "auctionId-bidAmt-index",
          "KeyConditionExpression": "auctionId = :a",
          "ExpressionAttributeValues": {
            ":a": {
              "S.$": "$.auctionId"
            }
          },
          "ScanIndexForward": false,
          "Limit": 1
        },
        "ResultPath": "$.highest",
        "Next": "IsFirstBid"
      },
      "IsFirstBid": {
        "Type": "Choice",
        "Choices": [
          {
            "Variable": "$.highest.Count",
            "NumericEquals": 0,
            "Next": "InitHighBid"
          }
        ],
        "Default": "ExtractHighBid"
      },
      "InitHighBid": {
        "Type": "Pass",
        "Parameters": {
          "highBid": 0
        },
        "ResultPath": "$.highBidValue",
        "Next": "ValidateBid"
      },
      "ExtractHighBid": {
        "Type": "Pass",
        "Parameters": {
          "highBid.$": "States.StringToJson($.highest.Items[0].bidAmt.N)"
        },
        "ResultPath": "$.highBidValue",
        "Next": "ValidateBid"
      },
      "ValidateBid": {
        "Type": "Choice",
        "Choices": [
          {
            "Variable": "$.userBalance.acctBalance",
            "NumericLessThanPath": "$.bidAmt",
            "Next": "InsufficientFunds"
          },
          {
            "Variable": "$.highBidValue.highBid",
            "NumericGreaterThanEqualsPath": "$.bidAmt",
            "Next": "LowBid"
          }
        ],
        "Default": "PutBid"
      },
      "InsufficientFunds": {
        "Type": "Fail",
        "Cause": "InsufficientFunds"
      },
      "LowBid": {
        "Type": "Fail",
        "Cause": "Bid is low"
      },
      "PutBid": {
        "Type": "Task",
        "Resource": "arn:aws:states:::dynamodb:putItem",
        "Parameters": {
          "TableName": "Bids",
          "Item": {
            "auctionId": {
              "S.$": "$.auctionId"
            },
            "date": {
              "S.$": "$$.State.EnteredTime"
            },
            "bidTime#userId": {
              "S.$": "States.Format('{}#{}', $$.State.EnteredTime, $.userId)"
            },
            "bidAmt": {
              "N.$": "States.Format('{}', $.bidAmt)"
            },
            "userId": {
              "S.$": "$.userId"
            }
          }
        },
        "End": true
      }
    }
  }
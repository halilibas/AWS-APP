{
    "Comment": " Close Auction State Machine",
    "StartAt": "GetAuction",
    "States": {
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
        "Next": "GetHighestBid"
      },
      "GetHighestBid": {
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
        "ResultPath": "$.bids",
        "Next": "HasBids"
      },
      "HasBids": {
        "Type": "Choice",
        "Choices": [
          {
            "Variable": "$.bids.Count",
            "NumericGreaterThan": 0,
            "Next": "GetUserInfo"
          }
        ],
        "Default": "MarkNoWinner"
      },
      "GetUserInfo": {
        "Type": "Task",
        "Resource": "arn:aws:states:::dynamodb:getItem",
        "Parameters": {
          "TableName": "Users",
          "Key": {
            "userId": {
              "S.$": "$.bids.Items[0].userId.S"
            }
          }
        },
        "ResultPath": "$.user",
        "Next": "ExtractAmounts"
      },
      "ExtractAmounts": {
        "Type": "Pass",
        "Parameters": {
          "acctBalance.$": "States.StringToJson($.user.Item.acctBalance.N)",
          "bidAmt.$": "States.StringToJson($.bids.Items[0].bidAmt.N)"
        },
        "ResultPath": "$.parsed",
        "Next": "CheckBalance"
      },
      "CheckBalance": {
        "Type": "Choice",
        "Choices": [
          {
            "Variable": "$.parsed.acctBalance",
            "NumericGreaterThanEqualsPath": "$.parsed.bidAmt",
            "Next": "DeductFunds"
          }
        ],
        "Default": "MarkNoWinner"
      },
      "DeductFunds": {
        "Type": "Task",
        "Resource": "arn:aws:states:::aws-sdk:dynamodb:updateItem",
        "Parameters": {
          "TableName": "Users",
          "Key": {
            "userId": {
              "S.$": "$.bids.Items[0].userId.S"
            }
          },
          "UpdateExpression": "ADD acctBalance :negBid",
          "ExpressionAttributeValues": {
            ":negBid": {
              "N.$": "States.Format('-{}', $.parsed.bidAmt)"
            }
          }
        },
        "ResultPath": null,
        "Next": "MarkWinner"
      },
      "MarkWinner": {
        "Type": "Task",
        "Resource": "arn:aws:states:::aws-sdk:dynamodb:updateItem",
        "Parameters": {
          "TableName": "Auctions",
          "Key": {
            "auctionId": {
              "S.$": "$.auctionId"
            }
          },
          "UpdateExpression": "SET winningUserId = :w, #st = :closed",
          "ExpressionAttributeNames": {
            "#st": "status"
          },
          "ExpressionAttributeValues": {
            ":w": {
              "S.$": "$.bids.Items[0].userId.S"
            },
            ":closed": {
              "S": "closed"
            }
          }
        },
        "Next": "Complete"
      },
      "MarkNoWinner": {
        "Type": "Task",
        "Resource": "arn:aws:states:::aws-sdk:dynamodb:updateItem",
        "Parameters": {
          "TableName": "Auctions",
          "Key": {
            "auctionId": {
              "S.$": "$.auctionId"
            }
          },
          "UpdateExpression": "SET #st = :closed",
          "ExpressionAttributeNames": {
            "#st": "status"
          },
          "ExpressionAttributeValues": {
            ":closed": {
              "S": "closed"
            }
          }
        },
        "Next": "Complete"
      },
      "Complete": {
        "Type": "Pass",
        "End": true
      }
    }
  }
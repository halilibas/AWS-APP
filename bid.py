import json
import boto3
import decimal
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table("Bids")


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, decimal.Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super().default(obj)

def respond(status, body):
    return {
        "statusCode": status,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*"
        },
        "body": json.dumps(body, cls=DecimalEncoder)
    }

def lambda_handler(event, context):
    params = event.get("queryStringParameters") or {}
    auction_id = (params.get("auctionId") or params.get("auctionID") or "").strip()

    if not auction_id:
        return respond(400, {"error": "Missing auctionId query parameter"})

    print("Auction ID:", repr(auction_id))

    try:
        resp = table.query(
            IndexName="auctionId-bidAmt-index",
            KeyConditionExpression=Key("auctionId").eq(auction_id),
            ScanIndexForward=False
        )
        return respond(200, resp.get("Items", []))

    except Exception as e:
        print("Error:", e)
        return respond(500, {"error": "Server error"})
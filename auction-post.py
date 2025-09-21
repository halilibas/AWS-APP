import json
import boto3
import decimal

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Auctions')

def build_response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Methods': '*'
        },
        'body': json.dumps(body)
    }

def lambda_handler(event, context):
    try:
        body = json.loads(event['body'])

        auction_id = body.get('auctionId')
        item_name = body.get('itemName')
        reserve = body.get('reserve')
        description = body.get('description')
        status = body.get('status', 'open')
        winning_user_id = body.get('winningUserId', '')

        if not all([auction_id, item_name, reserve, description]):
            return build_response(400, {'message': 'Missing required fields'})

        table.put_item(Item={
            'auctionId': auction_id,
            'itemName': item_name,
            'reserve': reserve,
            'description': description,
            'status': status,
            'winningUserId': winning_user_id
        })

        return build_response(200, {'message': 'Auction created successfully'})

    except Exception as e:
        return build_response(500, {'message': 'Internal server error', 'error': str(e)})
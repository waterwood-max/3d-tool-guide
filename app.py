import os
import json
from flask import Flask, render_template, request, redirect, url_for, session, jsonify

app = Flask(__name__)
app.secret_key = os.environ.get('GUIDE_SECRET', 'guide-dev-secret-2024')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'go1459@@')
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data', 'guide')

TOOLS = ['c4d', 'blender', 'octane', 'aftereffects']
TOOL_NAMES = {
    'c4d': 'Cinema 4D',
    'blender': 'Blender',
    'octane': 'Octane',
    'aftereffects': 'After Effects'
}


def load_tool_data(tool_id):
    path = os.path.join(DATA_DIR, f'{tool_id}.json')
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data


def save_tool_data(tool_id, data):
    path = os.path.join(DATA_DIR, f'{tool_id}.json')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def get_categories(items):
    """Extract ordered unique categories from items list."""
    seen = []
    for item in items:
        cat = item.get('category', 'General')
        if cat not in seen:
            seen.append(cat)
    return seen


# ---------- Routes ----------

@app.route('/')
def index():
    return redirect(url_for('guide_index'))

@app.route('/guide')
def guide_index():
    tools_data = {}
    for tool_id in TOOLS:
        try:
            td = load_tool_data(tool_id)
            td['categories'] = get_categories(td.get('items', []))
            tools_data[tool_id] = td
        except Exception as e:
            tools_data[tool_id] = {
                'tool': tool_id,
                'name': TOOL_NAMES[tool_id],
                'items': [],
                'categories': []
            }
    return render_template(
        'guide/index.html',
        tools=TOOLS,
        tool_names=TOOL_NAMES,
        tools_data=tools_data
    )


@app.route('/guide/api/<tool_id>')
def guide_api_tool(tool_id):
    if tool_id not in TOOLS:
        return jsonify({'error': 'Not found'}), 404
    try:
        data = load_tool_data(tool_id)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/guide/admin', methods=['GET', 'POST'])
def guide_admin_login():
    if session.get('guide_admin'):
        return redirect(url_for('guide_admin_dashboard'))
    error = None
    if request.method == 'POST':
        if request.form.get('password', '') == ADMIN_PASSWORD:
            session['guide_admin'] = True
            return redirect(url_for('guide_admin_dashboard'))
        error = '비밀번호가 틀렸습니다.'
    return render_template('guide/admin_login.html', error=error)


@app.route('/guide/admin/logout')
def guide_admin_logout():
    session.pop('guide_admin', None)
    return redirect(url_for('guide_admin_login'))


@app.route('/guide/admin/dashboard')
def guide_admin_dashboard():
    if not session.get('guide_admin'):
        return redirect(url_for('guide_admin_login'))
    tools_data = {}
    for tool_id in TOOLS:
        try:
            td = load_tool_data(tool_id)
            td['categories'] = get_categories(td.get('items', []))
            tools_data[tool_id] = td
        except Exception:
            tools_data[tool_id] = {
                'tool': tool_id,
                'name': TOOL_NAMES[tool_id],
                'items': [],
                'categories': []
            }
    return render_template(
        'guide/admin_dashboard.html',
        tools=TOOLS,
        tool_names=TOOL_NAMES,
        tools_data=tools_data
    )


@app.route('/guide/admin/item/add', methods=['POST'])
def guide_admin_add_item():
    if not session.get('guide_admin'):
        return redirect(url_for('guide_admin_login'))
    tool_id = request.form.get('tool_id')
    data = load_tool_data(tool_id)
    items = data.get('items', [])

    new_item = {
        'id': request.form.get('id', '').strip() or f'item_{len(items)}',
        'name': request.form.get('name', '').strip(),
        'description': request.form.get('description', '').strip(),
        'category': request.form.get('category', '').strip(),
        'badge': request.form.get('badge', 'shortcut').strip(),
        'mac': request.form.get('mac', '').strip(),
        'win': request.form.get('win', '').strip(),
    }
    items.append(new_item)
    data['items'] = items
    save_tool_data(tool_id, data)
    return redirect(url_for('guide_admin_dashboard') + f'?tool={tool_id}')


@app.route('/guide/admin/item/edit', methods=['POST'])
def guide_admin_edit_item():
    if not session.get('guide_admin'):
        return redirect(url_for('guide_admin_login'))
    tool_id = request.form.get('tool_id')
    item_id = request.form.get('item_id')
    data = load_tool_data(tool_id)
    for item in data.get('items', []):
        if item['id'] == item_id:
            item['name'] = request.form.get('name', item['name']).strip()
            item['description'] = request.form.get('description', item.get('description', '')).strip()
            item['category'] = request.form.get('category', item.get('category', '')).strip()
            item['badge'] = request.form.get('badge', item.get('badge', 'shortcut')).strip()
            item['mac'] = request.form.get('mac', item.get('mac', '')).strip()
            item['win'] = request.form.get('win', item.get('win', '')).strip()
            break
    save_tool_data(tool_id, data)
    return redirect(url_for('guide_admin_dashboard') + f'?tool={tool_id}')


@app.route('/guide/admin/item/delete', methods=['POST'])
def guide_admin_delete_item():
    if not session.get('guide_admin'):
        return redirect(url_for('guide_admin_login'))
    tool_id = request.form.get('tool_id')
    item_id = request.form.get('item_id')
    data = load_tool_data(tool_id)
    data['items'] = [i for i in data.get('items', []) if i['id'] != item_id]
    save_tool_data(tool_id, data)
    return redirect(url_for('guide_admin_dashboard') + f'?tool={tool_id}')


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(debug=False, host='0.0.0.0', port=port)

import React from "react";
import './Session.css';
import { ResizableChild } from "./ToolWindow";

interface CustomerRecord {
  id?: number;
  lname?: string;
  fname?: string;
  email?: string;
  addr?: string;
  addr2?: string;
  city?: string;
  prov?: string;
  country?: string;
  notes?: string;
  ver?: number;
  nextrev?: number | null;
  deleted?: boolean;
}

interface InvhRecord {
  id: number;
  custid: number;
  date: number;
}

interface InvdRecord {
  id: number;
  invid: number;
  sid: number;
}

interface InvpRecord {
  id: number;
  invid: number;
  amt: number;
}

interface SessionRecord {
  id?: number;
  custid: number;
  uid: number;
  created: number;
  notes?: string;
}

enum SessionEvent {
  START,
  PAUSE,
  CONTINUE,
  END
}

const SessionEvent_English = [
  'START',
  'PAUSE',
  'CONTINUE',
  'END'
]

interface SessionEventRecord {
  id?: number;
  sid: number;
  event: SessionEvent;
  date: number;
}

interface SessionDashboardProps {

}

interface SessionList {
  header: SessionRecord;
  details: SessionEventRecord[];
}

interface SessionDashboardState {
  customers: CustomerRecord[] | null;
  checkedCustomers: Set<number>;
  editedCustomers: Set<number>;
  unpaidSessions: Map<number, SessionList[]>;
  displayedSessions: Set<number>;
}

interface BackendConnection {
  getJSON<T>(url: string, options?: RequestInit): Promise<T>;
  get(url: string, options?: RequestInit): Promise<Response>;
  del(url: string, options?: RequestInit): Promise<Response>;
  post<T>(url: string, body: T, options?: RequestInit): Promise<Response>;
  put<T>(url: string, body: T, options?: RequestInit): Promise<Response>;
  patch<T>(url: string, body: T, options?: RequestInit): Promise<Response>;
}

interface URLInfo {
  tableName: string | null;
  key: number | null;
  indexName: string | null;
  after: string | null;
  since: string | null;
  upTo: string | null;
  until: string | null;
  offset: string | null;
  limit: string | null;
}

class IndexDBBackend implements BackendConnection {
  constructor(private db: IDBDatabase) {
  }

  static openDB(name: string): Promise<IndexDBBackend> {
    let databaseVer = 1;
    let db = IndexDBBackend.open(name, databaseVer, (db: IDBDatabase) => {
      
      let customerTable = db.createObjectStore('customer', {
        autoIncrement: true,
        keyPath: 'id'
      });
      customerTable.createIndex('primary', 'id', {
        unique: true
      });
      customerTable.createIndex('name', [
        'deleted',
        'nextrev',
        'lname',
        'fname'
      ], {
        unique: false
      });
      customerTable.createIndex('email', [
        'deleted',
        'nextrev',
        'email'
      ], {
        unique: false
      });

      let transactions: IDBTransaction[] = [];
      transactions.push(customerTable.transaction);

      let sessionTable = db.createObjectStore('session', {
        autoIncrement: true,
        keyPath: 'id'
      });

      sessionTable.createIndex('primary', 'id', {
        unique: true
      });
      
      sessionTable.createIndex('uid', 'uid', {
        unique: false
      });
      
      sessionTable.createIndex('custid', 'custid', {
        unique: false
      });

      transactions.push(sessionTable.transaction);

      let sessionEvent = db.createObjectStore('sessionevent', {
        autoIncrement: true,
        keyPath: 'id'
      })

      sessionEvent.createIndex('id', 'id', {
        unique: true
      });
      sessionEvent.createIndex('sid', 'sid', {
        unique: false
      });
      sessionEvent.createIndex('custid', 'custid', {
        unique: false
      });

      return Promise.all(transactions.map((transaction) => {
        return IndexDBBackend.wrapTxn(transaction);
      })).then(() => {
        return db;
      });
    });

    return db.then((db) => {      
      return new IndexDBBackend(db);
    });
  }

  static open(name: string, version: number, 
      upgrade: (db: IDBDatabase) => Promise<IDBDatabase>)
      : Promise<IDBDatabase> {
    return new Promise<IDBDatabase>((resolve, reject) => {
      let req = indexedDB.open(name, version);
      req.addEventListener('success', (ev) => {
        resolve(req.result);
      });
      req.addEventListener('error', (ev) => {
        reject(req.error);
      });
      req.addEventListener('upgradeneeded', (ev) => {
        resolve(upgrade(req.result));
      });
    });
  }

  static wrap<T>(req: IDBRequest<T>): Promise<T | null> {
    return new Promise<T>((resolve, reject) => {      
      req.addEventListener('success', (ev) => {
        resolve(req.result);
      });
      req.addEventListener('error', (ev) => {
        reject(req.error);
      });
    });
  }

  static wrapTxn(txn: IDBTransaction): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      txn.addEventListener('complete', (ev) => {
        resolve(true);
      });
      txn.addEventListener('error', (ev) => {
        reject(txn.error);
      });
      txn.addEventListener('abort', (ev) => {
        resolve(false);
      });
    });
  }

  parseURL(urlText: string): URLInfo {
    let url = new URL(urlText, 'http://0.0.0.0/');
    let match = url.pathname.match(/\/api\/([^/]+)(?:\/([^/]+))?/);
    return {
      tableName: match ? match[1] : null,
      key: (match && match[2]) ? Number(match[2]) : null,
      indexName: url.searchParams.get('indexName'),
      after: url.searchParams.get('after'),
      since: url.searchParams.get('since'),
      upTo: url.searchParams.get('upTo'),
      until: url.searchParams.get('until'),
      offset: url.searchParams.get('offset'),
      limit: url.searchParams.get('limit')
    };
  }

  getJSON<T>(url: string, options?: RequestInit): Promise<T> {
    return this.get(url, options).then((response) => {
      return response.json();
    });
  }

  get(url: string, options?: RequestInit): Promise<Response> {
    let info = this.parseURL(url);

    if (!info.tableName)
      return Promise.reject(new Error('Missing table name'));

    let txn = this.db.transaction(info.tableName, 'readonly');
    let table = txn.objectStore(info.tableName);
    if (info.indexName) {
      let index = table.index(info.indexName);
      let offset = Number(info.offset) || 0;
      let limit = Number(info.limit) || undefined;
      let after = Number(info.after) || null;
      let since = Number(info.since) || null;
      let upTo = Number(info.upTo) || null;
      let until = Number(info.until) || null;
      
      let st = after || since;
      let so = st === after;
      let en = upTo || until;
      let eo = en === until;
      
      let keyRange;
      if (st && en)
        keyRange = IDBKeyRange.bound(st, en, so, eo);
      else if (st)
        keyRange = IDBKeyRange.lowerBound(st, so);
      else if (en)
        keyRange = IDBKeyRange.upperBound(en, eo);
      else
        keyRange = null;

      let req = index.openCursor(keyRange);
      
      return IndexDBBackend.iterate(req, (result: any[], value: any) => {
        result.push(value);
      }, []).then((result) => {
        return IndexDBBackend.successfulResponse(result);
      });
    }

    let req;
    if (info.key)
      req = table.get(info.key);
    else
      req = table.getAll();
    
    return IndexDBBackend.wrap(req).then((list) => {
      if (info.key && list && list.length === 1)
        return IndexDBBackend.successfulResponse(list[0]);
      return IndexDBBackend.successfulResponse(list);
    });
  }

  static iterate<R>(req: IDBRequest<IDBCursorWithValue | null>, 
      callback: (result: R, value: any) => boolean | void, result: R)
      : Promise<R> {
    return new Promise<R>((resolve, reject) => {
      req.addEventListener('success', (ev) => {
        let cursor = req.result;

        try {
          if (cursor && callback(result, cursor.value) !== false)
            cursor.continue();
          else
            resolve(result);
        } catch (err) {
          reject(err);
        }
      });
      req.addEventListener('error', (ev) => {
        reject(req.error);
      });
    });
  }

  del(url: string, options: RequestInit): Promise<Response> {
    let match = url.match(/^\/api\/([^?/#]+)\/(\d+)/);
    let tableName = (match && match[1]) || '';
    let key = (match && +match[2]) || 0;
    let txn = this.db.transaction(tableName, 'readwrite');
    let table = txn.objectStore(tableName);
    let delPromise = IndexDBBackend.wrap(table.delete(key));
    return delPromise.then(() => {
      return IndexDBBackend.successfulResponse({});
    });
  }

  static successfulResponse<T>(body: T): Response {
    return new Response(JSON.stringify(body), {
      status: 200,
      statusText: 'OK'
    });
  }

  static notFoundResponse(): any {
    throw new Error("Method not implemented.");
  }

  post<T>(url: string, body: T, options: RequestInit): Promise<Response> {
    let match = url.match(/^\/api\/([^?/#]+)/);
    let tableName = (match && match[1]) || '';
    let txn = this.db.transaction(tableName, 'readwrite');
    let table = txn.objectStore(tableName);
    let addPromise = table.add(body);
    return IndexDBBackend.wrap(addPromise).then((key) => {
      return IndexDBBackend.successfulResponse({
        id: key
      });
    });
  }

  put<T>(url: string, body: T, options: RequestInit): Promise<Response> {
    let match = url.match(/^\/api\/([^?/#]+)\/(\d+)/);
    let tableName = (match && match[1]) || '';
    let key = (match && +match[2]) || 0;
    let txn = this.db.transaction(tableName, 'readwrite');
    let table = txn.objectStore(tableName);
    return IndexDBBackend.wrap(table.openCursor(key)).then((cursor) => {
      if (!cursor)
        return IndexDBBackend.notFoundResponse();
      return IndexDBBackend.wrap(cursor?.update(body)).then((id) => {
        return IndexDBBackend.successfulResponse({
          id: id
        });
      });
    });
  }

  patch<T>(url: string, body: T, options: RequestInit): Promise<Response> {
    let match = url.match(/^\/api\/([^?/#]+)\/(\d+)/);
    let tableName = (match && match[1]) || '';
    let key = (match && +match[2]) || 0;
    let txn = this.db.transaction(tableName, 'readwrite');
    let table = txn.objectStore(tableName);
    return IndexDBBackend.wrap(table.openCursor(key)).then((cursor) => {
      if (!cursor)
        return IndexDBBackend.notFoundResponse();
      let repl = Object.assign(Object.create(null), cursor?.value, body);
      return IndexDBBackend.wrap(cursor?.update(repl)).then((id) => {
        return IndexDBBackend.successfulResponse({
          id: id
        });
      });
    });
  }
}

export class SessionDashboard 
    extends React.Component<SessionDashboardProps, SessionDashboardState>
    implements ResizableChild {
  private backend: BackendConnection | null = null;
  
  constructor(props: SessionDashboardProps) {
    super(props);
    this.state = {
      customers: null,
      checkedCustomers: new Set<number>(),
      editedCustomers: new Set<number>(),
      unpaidSessions: new Map<number, SessionList[]>(),
      displayedSessions: new Set<number>()
    };
  }

  resize(width: number, height: number): void {
  }
  clampWithin(left: number, top: number,
      right: number, bottom: number): boolean {
    return false;
  }

  componentDidMount(): void {
    IndexDBBackend.openDB('testdb1').then((backend) => {
      this.backend = backend;
      
      this.refreshCustomers();
    });
  }

  private refreshCustomers() {
    let backend = this.backend;

    if (!backend) {
      this.setState({
        customers: null
      });
      return;
    }

    let customersPromise = backend.getJSON<CustomerRecord[]>('/api/customer');

    customersPromise.then((customers: CustomerRecord[]) => {
      this.setState({
        customers: customers
      });
    }).catch(() => {
      this.setState({
        customers: null
      });
    });
  }

  render() {
    return <div className="customer-list-container" style={{
        position: 'absolute',
        left: 0,
        top: 0,
        right: 0,
        bottom: 0
        }}>
      {this.renderCustomerList()}
    </div>;
  }

  customerListLoading(): JSX.Element {
    return <div>
      Loading customer list...
    </div>;
  }

  updateIdSet(set: Set<number>, n: number, add: boolean): void {
    if (add)
      set.add(n);
    else
      set.delete(n);
  }

  customerList(): JSX.Element[] {
    if (!this.state.customers)
      return [];
    
    return this.state.customers.map((customer) => {
      return <div className="editgrid-row" key={customer.id}>
        <div className="editgrid-col">
          <input
              type="checkbox"
              defaultChecked={
                this.state.checkedCustomers.has(customer.id || -1)
              }
              onChange={(ev) => this.updateIdSet(
                  this.state.checkedCustomers,
                  customer.id!, ev.target.checked)}
              />
        </div>
        <div className="editgrid-col">
          {
            this.state.editedCustomers.has(customer.id || -1)
              ? <label>
                  <span className="editgrid-caption">
                    E-mail
                  </span>
                  <input
                      defaultValue={customer.email}
                      onChange={(ev) => customer.email = ev.target.value}/>
                </label>
              : customer.email
          }
        </div>
        <div className="editgrid-col">
          {
            this.state.editedCustomers.has(customer.id || -1)
              ? <>
                  <label>
                    <span className="editgrid-caption">
                      Last Name
                    </span>
                    <input
                        defaultValue={customer.lname}
                        onChange={(ev) => customer.lname = ev.target.value}/>
                  </label>
                  <label>
                    <span className="editgrid-caption">
                      First Name
                    </span>
                    <input
                      defaultValue={customer.fname}
                      onChange={(ev) => customer.fname = ev.target.value}/>
                  </label>
                </>
              : this.formatCustomerName(customer)
          }
        </div>
        <div className="editgrid-col">
          <button
              onClick={(ev) => this.startSession(ev, customer)}>
            Start
          </button>
          <button
              onClick={(ev) => this.deleteCustomer(ev, customer)}>
            Delete
          </button>
          <button
              onClick={(ev) => this.saveEditCustomer(ev, customer)}>
            {
              this.state.editedCustomers.has(customer.id || -1)
                ? 'Save'
                : 'Edit'
            }
          </button>
          <input type="checkbox"
            onChange={(ev) => this.toggleUnpaid(
              customer, ev.target.checked)}/>
        </div>
        <div style={
          customer.id && this.state.displayedSessions.has(customer.id)
            ? { }
            : { display: 'none' }
        }>
          {this.unpaidList(customer)}
        </div>
      </div>;
    });
  }

  unpaidList(customer: CustomerRecord): React.ReactNode {
    if (!customer || !customer.id)
      return null;
    
    let sessionList = this.state.unpaidSessions.get(customer.id);

    if (!sessionList)
      return <div>Loading...</div>;

    return sessionList.map((sessionInfo) => {
      if (!sessionInfo.details.length) {
        return <div key={'no-events-' + sessionInfo.header.id}>
          No events
        </div>;
      }

      return sessionInfo.details.map((event) => {
        return <div key={event.id} className="editgrid-row">
          <div className="editgrid-col">
            {this.formatDate(event.date)}
          </div>

          <div className="editgrid-col">
            {SessionEvent_English[event.event]}
          </div>
        </div>;
      });
    });
  }

  static leadZero(n: number): string {
    return ('0' + n).substr(-2);
  }

  formatDate(unixDateMs: number): React.ReactNode {
    let date = new Date(unixDateMs);
    let yr = date.getFullYear();
    let mo = date.getMonth();
    let da = date.getDate();
    let hr = date.getHours();
    let mi = date.getMinutes();
    let se = date.getSeconds();
    
    //let now = Date.now();
    //let ago = now - unixDate;
    //let agoSe = ago / 1000;

    return yr + '/' + [mo, da].map(SessionDashboard.leadZero).join('/') + ' ' +
        hr + ':' + [mi, se].map(SessionDashboard.leadZero).join(':');
  }

  toggleUnpaid(customer: CustomerRecord,
      checked: boolean): void {
    if (!customer || !customer.id)
      return;
    this.updateIdSet(this.state.displayedSessions, customer.id, checked);
    if (!this.state.unpaidSessions.has(customer.id) &&
        checked) {
      if (!this.backend)
        return;
      this.loadUnpaid(customer);
    } else {
      this.setState({});
    }
  }

  private loadUnpaid(customer: CustomerRecord): void {
    if (!customer.id)
      return;
    
    if (!this.backend)
      return;
    
    // Load session list
    let headReq = this.backend.getJSON<SessionRecord[]>(
      '/api/session' +
      '?indexName=custid' +
      '&since=' + customer.id +
      '&upTo=' + customer.id);
    headReq.then((headers) => {
      let detailReqs = headers.map((header) => {
        return this.backend!.getJSON<SessionEventRecord[]>(
          '/api/sessionevent' +
          '?indexName=sid' +
          '&since=' + header.id + 
          '&upTo=' + header.id);
      });

      return Promise.all([
        Promise.all(headers),
        Promise.all(detailReqs)
      ]);
    }).then(([headers, details]: [SessionRecord[], SessionEventRecord[][]]) => {
      return headers.map((header, index) => {
        return {
          header: header,
          details: details[index]
        };
      });
    }).then((results: SessionList[]) => {
      this.state.unpaidSessions.set(customer.id!, results);
      this.updateIdSet(this.state.displayedSessions, customer.id!, true);
      this.setState({});
    });
  }

  renderCustomerList(): JSX.Element {
    if (this.state.customers === null)
      return this.customerListLoading();
    
    return <>
      <div>
        <button onClick={(ev) => this.createCustomer(ev)}>
          Create customer
        </button>
      </div>
      <div>
        {this.customerList()}
      </div>
    </>;
  }

  createCustomer(ev: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
    if (!this.backend || !this.state.customers)
      return;
    
    this.state.customers.push({
      id: -1
    });

    this.state.editedCustomers.add(-1);
    
    this.setState({});
  }

  insertCustomer(customer: CustomerRecord): Promise<number> {
    if (!this.backend)
      return Promise.reject(new Error('null backend'));
    return this.backend.post<CustomerRecord>(
        '/api/customer', customer).then((response) => {
      return response.json();
    }).then((response) => {
      return response.id;
    });
  }

  saveEditCustomer(ev: React.MouseEvent<HTMLButtonElement, MouseEvent>, 
      customer: CustomerRecord): void {
    if (!customer.id)
      return;

    if (this.state.editedCustomers.has(customer.id!)) {
      //
      // Saving

      if (customer.id < 0) {
        delete customer.id;
        this.insertCustomer(customer).then((id) => {
          this.state.editedCustomers.delete(customer.id!);
          customer.id = id;
          this.setState({});
        });
      } else {
        this.putCustomer(customer).then(() => {
          this.state.editedCustomers.delete(customer.id!);
          this.setState({});
        });
      }
    } else {
      //
      // Editing
      this.state.editedCustomers.add(customer.id!);
      this.setState({});
    }
  }

  putCustomer(customer: CustomerRecord): Promise<void> {
    if (!this.backend || !customer.id)
      return Promise.reject(new Error('not ready'));
    
    return this.backend.put('/api/customer/' + customer.id, customer).then(() => {
      this.refreshCustomers();
    });
  }

  deleteCustomer(ev: React.MouseEvent<HTMLButtonElement, MouseEvent>, 
      customer: CustomerRecord): void {
    if (!customer || !customer.id || !this.state.customers || !this.backend)
      return;
    
    let index = this.state.customers.findIndex((candidate) => {
      return candidate.id === customer.id;
    });
    
    let promise: Promise<any>;
    if (customer.id > 0)
      promise = this.backend?.del('/api/customer/' + customer.id);
    else
      promise = Promise.resolve();
    
    promise.then(() => {
      this.state.customers!.splice(index, 1);
    });
  }

  startSession(ev: React.MouseEvent<HTMLButtonElement, MouseEvent>, 
      customer: CustomerRecord): void {
    if (!this.backend)
      return;
    
    console.log('start session with ' + customer.id + ': ' + customer.email);

    let session: SessionRecord = {
      custid: customer.id!,
      uid: 1,
      created: Date.now()
    };

    this.backend.post('/api/session', session).then((response) => {
      return response.json();
    }).then((result) => {
      console.log('got result', result);

      let startEvent: SessionEventRecord = {
        sid: result.id,
        event: SessionEvent.START,
        date: Date.now()
      };

      return this.backend!.post('/api/sessionevent', startEvent);
    }).then((response) => {
      return response.json();
    });
  }

  formatCustomerName(customer: CustomerRecord): React.ReactNode {
    return (customer.lname && customer.fname)
        ? customer.lname + ', ' + customer.fname
        : customer.lname
        ? customer.lname
        : customer.fname
        ? customer.fname
        : '';
  }
}
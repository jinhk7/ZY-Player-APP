import ajax from 'uni-ajax'
import parser from 'fast-xml-parser'
import db from './database'

const http = {
  xmlConfig: {
    trimValues: true,
    textNodeName: '_t',
    ignoreAttributes: false,
    attributeNamePrefix: '_',
    parseAttributeValue: true
  },
  // 获取视频源详情
  async getSite (key) {
    const site = await db.get('site', key)
    if (site.flag) {
      return site.data
    }
    return false
  },
  // 获取视频源的分类
  async class (key) {
    const site = await this.getSite(key)
    try {
      const res = await ajax.post(site.api)
      const json = parser.parse(res.data, this.xmlConfig)
      console.log("视频分类:",json.rss.json)
      const arr = []
      if (json.rss.class) {
        for (const i of json.rss.class.ty) {
          const j = {
            tid: i._id,
            name: i._t
          }
          arr.push(j)
        }
      }
      return arr
    } catch (err) {
      return err
    }
  },
  // 获取视频资源
  async list (key, pg = 1, t) {
    const site = await this.getSite(key)
    const url = `${site.api}?ac=list&at=xml${t ? '&t=' + t: ''}&pg=${pg}`
    console.log("list:",url)
    try {
      const res = await ajax.post(url)
      const json = parser.parse(res.data, this.xmlConfig)
      if (json.rss.list.video) {
        return json.rss.list.video
      } else {
        return []
      }
    } catch (err) {
      return err
    }
  },
  // 获取总资源数, 以及页数
  async page (key, t) {
    const site = await this.getSite(key)
	t = t || 0; // 如果 t 没有值，将其设置为 0
	
    const url = `${site.api}?ac=list&at=xml${t ? '&t=' + t: ''}`
	//const url = `${site.api}?ac=list&t=${t}`
	console.log("func page: url:", url)
    try {
      const res = await ajax.post(url)
      const json = parser.parse(res.data, this.xmlConfig)
      console.log("page:",json.rss.list)
      const pg = {
        page: json.rss.list._page,
        pagecount: json.rss.list._pagecount,
        pagesize: json.rss.list._pagesize,
        recordcount: json.rss.list._recordcount
      }
      console.log("page2:",pg)
      return pg
    } catch (err) {
      return err
    }
  },
  // 搜索资源
  async search (key, wd) {
    const site = await this.getSite(key)
    wd = encodeURI(wd)
    const url = `${site.api}?wd=${wd}&at=xml`
    try {
      const res = await ajax.post(url, { timeout: 5000 })
      const json = parser.parse(res.data, this.xmlConfig)
      if (json && json.rss && json.rss.list) {
        const videoList = json.rss.list.video
        return videoList
      }
      return null
    } catch (err) {
      console.log("search-error:", err)
      return err
    }
  },
  // 获取资源详情
  async detail (key, id) {
    const site = await this.getSite(key)
    const url = `${site.api}?ac=detail&ids=${id}&at=xml`
    try {
      const res = await ajax.post(url)
      const json = parser.parse(res.data, this.xmlConfig)
      console.log("detail json: ",json.rss.list.video.dl.dd)
      if (json && json.rss && json.rss.list) {
        const videoList = json.rss.list.video
        let m3u8List = []
        const dd = videoList.dl.dd
        console.log("detail-dd:",dd)
        const type = Object.prototype.toString.call(dd)
        console.log("detail-type:",type)
        if (type === '[object Array]') {
          for (const i of dd) {
            if (i._flag.indexOf('m3u8') >= 0) {
              m3u8List = i._t.split('#')
            }
          }
        } else {
          m3u8List = dd._t.split('#')
        }
        videoList.m3u8List = m3u8List
        console.log("video list: ",videoList.m3u8List)
        return videoList
      }
      return null
    } catch (err) {
      return err
    }
  },
  // 通过 json url 导入视频源
  async site (jsonUrl) {
    try {
      const res = await ajax.get(jsonUrl)
      return res.data
    } catch (err) {
      return err
    }
  }
}

export default http

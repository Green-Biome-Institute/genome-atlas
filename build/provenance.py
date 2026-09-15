"""Normalise the Location and Contact columns into creditable provenance.

Two hard rules, both enforced here rather than in the view:
  * email addresses are never emitted
  * site coordinates are never emitted -- these are endangered plants and
    precise localities are a collection risk
"""
import re

EMAIL = re.compile(r'[\w.+-]+@[\w-]+\.[\w.]+')
COORD = re.compile(r'\(?\s*(?:site\s*coordinates?\s*[:=]?)?\s*'
                   r'-?\d{1,3}(?:\.\d+|\s*[°′″\'"\s\d.]*[NSEW])'
                   r'[,\s]+-?\d{1,3}(?:\.\d+|\s*[°′″\'"\s\d.]*[NSEW])\s*\)?',
                   re.I)

# Institutions, as they appear in the sheet -> what to show.
# Abbreviation expansions are a best reading of the sheet and are flagged for
# confirmation in the build notes; the raw string is always kept alongside.
INST = [
 (r'^ucbg',            'University of California Botanical Garden, Berkeley', 'garden', 'UCBG'),
 (r'^(rpbg|prbg|prgb|ebrpbg)', 'Regional Parks Botanic Garden, Tilden',      'garden', 'RPBG'),
 (r'^sbbg',            'Santa Barbara Botanic Garden',                       'garden', 'SBBG'),
 (r'^sfbg',            'San Francisco Botanical Garden',                     'garden', 'SFBG'),
 (r'^rsa\b',           'Rancho Santa Ana Botanic Garden',                    'garden', 'RSA'),
 (r'^sdzwa',           'San Diego Zoo Wildlife Alliance',                    'agency', 'SDZWA'),
 (r'^ebrpd',           'East Bay Regional Park District',                    'agency', 'EBRPD'),
 (r'humboldt botanical','Humboldt Botanical Garden',                         'garden', None),
 (r'bancroft',         'Bancroft Garden',                                    'garden', None),
 (r'east bay wilds',   'East Bay Wilds Nursery, Oakland',                    'nursery', None),
 (r'far reaches',      'Far Reaches Farm',                                   'nursery', None),
 (r'sonoma garden',    'Sonoma Garden',                                      'garden', None),
 (r'whittall-scu',     'Whittall lab, Santa Clara University',               'lab',    None),
 (r'^dr\.?\s*baysdorfer', 'Chris Baysdorfer collection',                     'lab',    None),
]
# people who appear in the Location column rather than the contact column
PEOPLE = [(r'\bjoanna\b|\bjonna\b', 'Joanna Garaventa'),
          (r'baysdorfer',           'Chris Baysdorfer'),
          (r'ron ratko',            'Ron Ratko')]

def clean(t):
    if not t: return None
    t = EMAIL.sub('', str(t))
    t = COORD.sub('', t)
    return re.sub(r'\s*[|,;]\s*$', '', re.sub(r'\s+', ' ', t)).strip(' -|,;') or None

def collector(contact):
    """Name only. The sheet stores 'Name\\nemail'; the email never leaves here."""
    t = clean(contact)
    if not t: return None
    name = EMAIL.sub('', str(contact)).split('\n')[0]
    name = re.sub(r'\s+', ' ', name).strip(' -|,;')
    return name or None

CA_COUNTIES = ("Alameda Alpine Amador Butte Calaveras Colusa Contra_Costa Del_Norte El_Dorado "
 "Fresno Glenn Humboldt Imperial Inyo Kern Kings Lake Lassen Los_Angeles Madera Marin Mariposa "
 "Mendocino Merced Modoc Mono Monterey Napa Nevada Orange Placer Plumas Riverside Sacramento "
 "San_Benito San_Bernardino San_Diego San_Francisco San_Joaquin San_Luis_Obispo San_Mateo "
 "Santa_Barbara Santa_Clara Santa_Cruz Shasta Sierra Siskiyou Solano Sonoma Stanislaus Sutter "
 "Tehama Trinity Tulare Tuolumne Ventura Yolo Yuba Josephine").replace('_',' ').split()
CA_COUNTIES = sorted(set(CA_COUNTIES) | {'Contra Costa','Del Norte','El Dorado','Los Angeles',
 'San Benito','San Bernardino','San Diego','San Francisco','San Joaquin','San Luis Obispo',
 'San Mateo','Santa Barbara','Santa Clara','Santa Cruz'}, key=len, reverse=True)

TYPO = {'livermore weland': 'Livermore wetland',
        'livermore wetland': 'Livermore wetland',
        'congdons tan plant': "Congdon's tarplant",
        'east bay hills': 'East Bay Hills'}

def source(loc):
    """-> (display label, kind, short code, wild locality or None)"""
    t = clean(loc)
    if not t: return (None, None, None, None)
    low = t.lower()
    for pat, label, kind, code in INST:
        if re.search(pat, low):
            return (label, kind, code, None)
    # a locality string: keep it at the coarse level the sheet gives, minus any
    # coordinates, and never finer than the named place + county
    # a locality string: keep it at the coarse level the sheet gives, minus any
    # coordinates, and never finer than the named place + county
    for county in CA_COUNTIES:
        m = re.search(r"\b" + re.escape(county) + r"\s+Co(?:unty)?\b\.?", t, re.I)
        if not m: continue
        head = t[:m.start()].strip(" ,|-")
        head = re.sub(r"^(collected\s+(at|from|by)\s+)", "", head, flags=re.I).strip(" ,|-")
        head = re.split(r"\s*\|\s*", head)[0].strip(" ,|-")
        label = ("%s, %s Co." % (head, county)) if head and head.lower() != county.lower() \
                else ("%s County" % county)
        return (label, 'wild', None, True)
    for pat, who in PEOPLE:
        if re.search(pat, low):
            return ('Collected by %s' % who, 'wild', None, True)
    if low in TYPO: return (TYPO[low], 'wild', None, True)
    return (t[:60], 'wild' if len(t) > 3 else 'unknown', None, True)
